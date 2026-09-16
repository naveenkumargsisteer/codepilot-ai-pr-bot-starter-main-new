import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getInstallationOctokit } from "../../../../lib/github";
import crypto from "crypto";

type Change = {
  type?: string;
  action?: string;
  path: string;
  content: string;
};

const MAX_FILES = 10;
const MAX_FILE_SIZE = 100 * 1024; // 100KB

const FORBIDDEN_DIRS = ["node_modules", ".git", ".next", "dist", "build"];
const FORBIDDEN_FILES = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];
const FORBIDDEN_EXTS = [
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
  ".mp3", ".mp4", ".wav", ".avi", ".mov", ".zip", ".tar",
  ".gz", ".pdf", ".exe", ".dll", ".so", ".dylib"
];

function isValidPath(filePath: string): boolean {
  if (filePath.includes("../") || filePath.includes("..\\")) return false;
  if (filePath.startsWith("/") || filePath.startsWith("\\")) return false;
  
  const parts = filePath.split(/[/\\]/);
  if (parts.some((part) => FORBIDDEN_DIRS.includes(part))) return false;

  const fileName = parts[parts.length - 1];
  if (FORBIDDEN_FILES.includes(fileName)) return false;

  const lowerPath = filePath.toLowerCase();
  if (FORBIDDEN_EXTS.some((ext) => lowerPath.endsWith(ext))) return false;

  return true;
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const installationId = cookieStore.get("github_installation_id")?.value;
    const selectedRepoCookie = cookieStore.get("selected_repo")?.value;

    if (!installationId || !selectedRepoCookie) {
      return NextResponse.json(
        { error: "Missing GitHub installation ID or selected repository in cookies" },
        { status: 401 }
      );
    }

    let selectedRepo;
    try {
      selectedRepo = JSON.parse(selectedRepoCookie);
    } catch {
      // In case it's a plain string like "owner/repo" instead of JSON
      selectedRepo = { full_name: selectedRepoCookie };
    }

    if (!selectedRepo.full_name) {
      return NextResponse.json(
        { error: "Invalid selected_repo format" },
        { status: 400 }
      );
    }

    const [owner, repo] = selectedRepo.full_name.split("/");
    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Invalid repository format" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { changes, request: userRequest } = body;

    if (!Array.isArray(changes)) {
      return NextResponse.json({ error: "Invalid changes format, expected an array" }, { status: 400 });
    }

    if (changes.length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    if (changes.length > MAX_FILES) {
      return NextResponse.json({ error: `Maximum ${MAX_FILES} files allowed` }, { status: 400 });
    }

    // Basic size and path format validation
    for (const change of changes as Change[]) {
      const type = change.type || change.action; // Some APIs might use 'action' instead of 'type'
      if (!["create", "modify"].includes(type as string)) {
        return NextResponse.json({ error: `Invalid change type for file ${change.path}` }, { status: 400 });
      }
      if (typeof change.path !== "string" || !isValidPath(change.path)) {
        return NextResponse.json({ error: `Invalid or forbidden path: ${change.path}` }, { status: 400 });
      }
      if (typeof change.content !== "string") {
        return NextResponse.json({ error: `Invalid content for file ${change.path}` }, { status: 400 });
      }
      const size = Buffer.byteLength(change.content, "utf8");
      if (size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File ${change.path} exceeds max size of 100KB` }, { status: 400 });
      }
    }

    const octokit = await getInstallationOctokit(installationId);

    // 1. Get repository info to find default branch
    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo,
    });
    const defaultBranch = repoData.default_branch;

    // 2. Get the commit SHA and tree SHA of the default branch
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
    });
    const baseCommitSha = refData.object.sha;

    const { data: commitData } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: baseCommitSha,
    });
    const baseTreeSha = commitData.tree.sha;

    // 3. Fetch the full repository tree for path existence validation
    const { data: treeData } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: baseTreeSha,
      recursive: "true",
    });

    const existingPaths = new Set(
      treeData.tree
        .filter((node) => node.type === "blob")
        .map((node) => node.path)
    );

    // 4. Validate paths against the actual tree
    for (const change of changes as Change[]) {
      const type = change.type || change.action;
      if (type === "modify" && !existingPaths.has(change.path)) {
        return NextResponse.json(
          { error: `Cannot modify ${change.path} as it does not exist in the repository` },
          { status: 400 }
        );
      }
      if (type === "create" && existingPaths.has(change.path)) {
        return NextResponse.json(
          { error: `Cannot create ${change.path} as it already exists in the repository` },
          { status: 400 }
        );
      }
    }

    // 5. Create blobs for the new file contents
    const newTreeNodes: any[] = [];
    for (const change of changes as Change[]) {
      const { data: blobData } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: change.content,
        encoding: "utf-8",
      });

      newTreeNodes.push({
        path: change.path,
        mode: "100644", // standard file mode
        type: "blob",
        sha: blobData.sha,
      });
    }

    // 6. Create a new tree based on the existing tree
    const { data: newTreeData } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: newTreeNodes,
    });

    // 7. Create a new commit
    const commitMessage = userRequest
      ? `Apply changes: ${userRequest.slice(0, 50)}${userRequest.length > 50 ? "..." : ""}`
      : "Apply changes from CodePilot";

    const { data: newCommitData } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: newTreeData.sha,
      parents: [baseCommitSha],
    });

    // 8. Create a new branch
    const branchName = `codepilot-changes-${crypto.randomBytes(4).toString("hex")}-${Date.now()}`;
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: newCommitData.sha,
    });

    return NextResponse.json({
      message: "Successfully created branch with approved changes",
      branch: branchName,
      commitSha: newCommitData.sha,
      changedFiles: changes.map((c) => c.path),
    });
  } catch (error: any) {
    console.error("Error writing to GitHub:", error);
    return NextResponse.json(
      { error: "Failed to write changes to GitHub", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
