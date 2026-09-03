import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getInstallationOctokit } from "../../../../lib/github";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const installationId = cookieStore.get("github_installation_id")?.value;

    if (!installationId) {
      return NextResponse.json(
        { error: "Unauthorized. Missing GitHub installation ID." },
        { status: 401 }
      );
    }

    const octokit = await getInstallationOctokit(installationId);

    const response = await octokit.rest.apps.listReposAccessibleToInstallation({
      per_page: 100,
    });

    const repositories = response.data.repositories.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      html_url: repo.html_url,
      default_branch: repo.default_branch,
    }));

    return NextResponse.json({ repositories });
  } catch (error) {
    console.error("Error fetching GitHub repositories:", error);
    return NextResponse.json(
      { error: "Failed to fetch GitHub repositories." },
      { status: 500 }
    );
  }
}
