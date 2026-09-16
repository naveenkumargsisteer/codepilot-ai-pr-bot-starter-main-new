import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getInstallationOctokit } from "../../../../lib/github";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const branch = searchParams.get("branch");

    if (!branch) {
      return NextResponse.json(
        { error: "Missing branch query parameter" },
        { status: 400 }
      );
    }

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

    const octokit = await getInstallationOctokit(installationId);

    try {
      const { data } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });

      return NextResponse.json({
        exists: true,
        repository: selectedRepo.full_name,
        branch: branch,
        sha: data.object.sha,
      });
    } catch (error: any) {
      // If GitHub returns 404, it means the branch does not exist
      if (error.status === 404) {
        return NextResponse.json({
          exists: false,
          repository: selectedRepo.full_name,
          branch: branch,
        });
      }

      // Re-throw any other errors
      throw error;
    }
  } catch (error: any) {
    console.error("Error verifying branch:", error);
    return NextResponse.json(
      { error: "Failed to verify branch" },
      { status: 500 }
    );
  }
}
