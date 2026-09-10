import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getInstallationOctokit } from "../../../../lib/github";

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON format." }, { status: 400 });
    }

    const { changes, request } = body;

    if (!changes || !Array.isArray(changes)) {
      return NextResponse.json({ error: "Changes array is required." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const selectedRepoCookie = cookieStore.get("selected_repo")?.value;

    if (!selectedRepoCookie) {
      return NextResponse.json({ error: "No repository selected." }, { status: 400 });
    }
    
    const installationId = cookieStore.get("github_installation_id")?.value;

    if (!installationId) {
      return NextResponse.json({ error: "GitHub installation not found." }, { status: 401 });
    }

    let repository;
    try {
      repository = JSON.parse(selectedRepoCookie);
    } catch (e) {
      return NextResponse.json({ error: "Invalid repository data format." }, { status: 400 });
    }
    
    if (!repository.full_name || typeof repository.full_name !== "string") {
      return NextResponse.json({ error: "Invalid repository format." }, { status: 400 });
    }

    const [owner, repo] = repository.full_name.split("/");

    if (!owner || !repo) {
      return NextResponse.json({ error: "Could not parse owner and repo." }, { status: 400 });
    }

    const default_branch = repository.default_branch || "main";

    const octokit = await getInstallationOctokit(installationId);
    
    let treeData: any[] = [];
    try {
      const { data: treeResponse } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: default_branch,
        recursive: "1",
      });
      treeData = treeResponse.tree.map((item: any) => {
        const result: any = {
          path: item.path,
          type: item.type
        };
        if (item.size !== undefined) {
          result.size = item.size;
        }
        return result;
      });
    } catch (treeError) {
      console.error("Failed to fetch tree:", treeError);
      return NextResponse.json({ error: "Failed to fetch repository tree." }, { status: 500 });
    }

    const safePaths = treeData
      .filter(f => f.type === 'blob')
      .map(f => f.path);
    const validPaths = new Set(safePaths);

    const MAX_FILES = 10;
    const MAX_CONTENT_SIZE = 100000;

    const validatedChanges = [];

    for (const change of changes) {
      if (!change.path || typeof change.path !== "string") continue;
      if (!change.action || !["modify", "create"].includes(change.action)) continue;
      if (typeof change.content !== "string") continue;
      if (change.content.length > MAX_CONTENT_SIZE) continue;
      if (change.path.includes("../") || change.path.startsWith("/")) continue;
      if (change.path.includes("node_modules")) continue;
      if (change.path.endsWith(".lock") || change.path.endsWith("-lock.json")) continue;
      if (change.path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|mp4|webm|pdf|zip|tar|gz|bin|exe|dll)$/i)) continue;

      if (change.action === "modify" && !validPaths.has(change.path)) {
        continue; // Path doesn't exist to modify
      }
      
      if (change.action === "create" && validPaths.has(change.path)) {
        continue; // Path already exists, cannot create
      }

      validatedChanges.push(change);
      
      if (validatedChanges.length >= MAX_FILES) break;
    }

    if (validatedChanges.length === 0) {
      return NextResponse.json({ error: "No valid changes to write." }, { status: 400 });
    }

    // 1. Get reference of default branch to get latest commit SHA
    let defaultBranchRef;
    try {
      const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${default_branch}`,
      });
      defaultBranchRef = refData;
    } catch (error) {
      console.error("Failed to get default branch ref:", error);
      return NextResponse.json({ error: "Failed to get default branch." }, { status: 500 });
    }
    const latestCommitSha = defaultBranchRef.object.sha;

    // 2. Get the commit to get the base tree SHA
    let baseCommit;
    try {
      const { data: commitData } = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: latestCommitSha,
      });
      baseCommit = commitData;
    } catch (error) {
      console.error("Failed to get base commit:", error);
      return NextResponse.json({ error: "Failed to get base commit." }, { status: 500 });
    }
    const baseTreeSha = baseCommit.tree.sha;

    // 3. Create blobs for each valid change
    const treeChanges = [];
    for (const change of validatedChanges) {
      try {
        const { data: blobData } = await octokit.rest.git.createBlob({
          owner,
          repo,
          content: change.content,
          encoding: "utf-8",
        });
        treeChanges.push({
          path: change.path,
          mode: "100644" as const,
          type: "blob" as const,
          sha: blobData.sha,
        });
      } catch (error) {
        console.error(`Failed to create blob for ${change.path}:`, error);
        return NextResponse.json({ error: `Failed to create blob for ${change.path}.` }, { status: 500 });
      }
    }

    // 4. Create a new tree
    let newTree;
    try {
      const { data: treeData } = await octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: baseTreeSha,
        tree: treeChanges,
      });
      newTree = treeData;
    } catch (error) {
      console.error("Failed to create new tree:", error);
      return NextResponse.json({ error: "Failed to create new tree." }, { status: 500 });
    }

    // 5. Create a new commit
    let newCommit;
    const commitMessage = request ? `Implement: ${request.substring(0, 50)}...` : "Apply CodePilot AI changes";
    try {
      const { data: commitData } = await octokit.rest.git.createCommit({
        owner,
        repo,
        message: commitMessage,
        tree: newTree.sha,
        parents: [latestCommitSha],
      });
      newCommit = commitData;
    } catch (error) {
      console.error("Failed to create commit:", error);
      return NextResponse.json({ error: "Failed to create commit." }, { status: 500 });
    }

    // 6. Create a new branch
    const branchName = `codepilot-${Date.now()}`;
    try {
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: newCommit.sha,
      });
    } catch (error) {
      console.error("Failed to create branch:", error);
      return NextResponse.json({ error: "Failed to create branch." }, { status: 500 });
    }

    return NextResponse.json({
      message: "Changes written successfully.",
      branch: branchName,
      commit_sha: newCommit.sha,
      files: validatedChanges.map(c => c.path),
    }, { status: 200 });

  } catch (error: any) {
    console.error("Chat write API error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
