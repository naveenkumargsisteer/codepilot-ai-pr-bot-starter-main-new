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

    const octokit = await getInstallationOctokit(installationId);
    
    const { data } = await octokit.rest.repos.get({
      owner,
      repo
    });

    return NextResponse.json({
      name: data.name,
      full_name: data.full_name,
      description: data.description,
      private: data.private,
      default_branch: data.default_branch,
      html_url: data.html_url
    }, { status: 200 });

  } catch (error: any) {
    console.error("GitHub repository API error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred while fetching repository." }, 
      { status: 500 }
    );
  }
}
