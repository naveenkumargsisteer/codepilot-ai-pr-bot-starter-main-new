import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getInstallationOctokit } from "../../../../lib/github";

export async function GET(req: NextRequest) {
  try {
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
      return NextResponse.json({ error: "Invalid repository data." }, { status: 400 });
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
    
    const { data } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: default_branch
    });

    const treeData = data.tree.map((item: any) => {
      const result: any = {
        path: item.path,
        type: item.type
      };
      if (item.size !== undefined) {
        result.size = item.size;
      }
      return result;
    });

    return NextResponse.json({ tree: treeData }, { status: 200 });

  } catch (error: any) {
    console.error("GitHub tree API error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred while fetching tree." }, 
      { status: 500 }
    );
  }
}
