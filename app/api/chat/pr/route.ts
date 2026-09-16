import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getInstallationOctokit } from "../../../../lib/github";

function isValidBranchName(branch: string): boolean {
  if (typeof branch !== "string" || !branch) return false;
  // A simple regex to reject obviously malicious characters in branch names.
  // Git branch names cannot contain spaces, ~, ^, :, *, ?, [, \ or run consecutive dots.
  if (/[~^:*?\[\]\\]/.test(branch)) return false;
  if (branch.includes("..")) return false;
  if (branch.includes(" ")) return false;
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
    const { branch, request: userRequest } = body;

    if (!isValidBranchName(branch)) {
      return NextResponse.json(
        { error: "Invalid branch name provided." },
        { status: 400 }
      );
    }

    if (!userRequest || typeof userRequest !== "string") {
      return NextResponse.json(
        { error: "Original request is required." },
        { status: 400 }
      );
    }

    const octokit = await getInstallationOctokit(installationId);

    // Dynamically determine the repository's current default branch
    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo,
    });
    const defaultBranch = repoData.default_branch;

    if (branch === defaultBranch) {
      return NextResponse.json(
        { error: "Cannot create a pull request from the default branch." },
        { status: 400 }
      );
    }

    // Verify that the requested branch exists in THIS repository
    try {
      await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });
    } catch (err: any) {
      if (err.status === 404) {
        return NextResponse.json(
          { error: `Branch ${branch} does not exist in the repository.` },
          { status: 404 }
        );
      }
      throw err;
    }

    // Check whether an open PR already exists
    const { data: existingPrs } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "open",
      head: `${owner}:${branch}`,
      base: defaultBranch,
    });

    if (existingPrs.length > 0) {
      const existingPr = existingPrs[0];
      return NextResponse.json({
        message: "Pull request already exists.",
        pull_request: {
          number: existingPr.number,
          url: existingPr.html_url,
          title: existingPr.title,
          head: branch,
          base: defaultBranch,
        },
      });
    }

    // Generate a clear PR title from the original user request
    const titleSummary = userRequest.length > 50 ? userRequest.slice(0, 50) + "..." : userRequest;
    const prTitle = `CodePilot: ${titleSummary}`;

    // PR body should include original request, a short statement, source branch, target branch
    const prBody = `### CodePilot Changes

**Original Request:**
> ${userRequest}

This Pull Request was generated and approved through CodePilot.

- **Source branch:** \`${branch}\`
- **Target branch:** \`${defaultBranch}\`
`;

    // Create a Pull Request
    const { data: newPr } = await octokit.rest.pulls.create({
      owner,
      repo,
      title: prTitle,
      body: prBody,
      head: branch,
      base: defaultBranch,
    });

    return NextResponse.json({
      message: "Pull request created.",
      pull_request: {
        number: newPr.number,
        url: newPr.html_url,
        title: newPr.title,
        head: branch,
        base: defaultBranch,
      },
    });
  } catch (error: any) {
    console.error("Error creating PR:", error);
    return NextResponse.json(
      { error: "Failed to create Pull Request", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
