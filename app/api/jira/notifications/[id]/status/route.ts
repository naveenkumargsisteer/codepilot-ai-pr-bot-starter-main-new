import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "../../../../../../lib/supabase";
import { getInstallationOctokit } from "../../../../../../lib/github";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const status = body.status;
    const currentStatus = body.currentStatus || 'pending';

    if (!['processed', 'dismissed', 'processing', 'pending'].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    
    const { id } = await params;

    const cookieStore = await cookies();
    const selectedRepoCookie = cookieStore.get("selected_repo")?.value;
    const installationId = cookieStore.get("github_installation_id")?.value;

    if (!selectedRepoCookie || !installationId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    let repository;
    try {
      repository = JSON.parse(selectedRepoCookie);
    } catch (e) {
      return NextResponse.json({ error: "Invalid repository format." }, { status: 400 });
    }

    const repoFullName = repository.full_name;
    if (!repoFullName || typeof repoFullName !== 'string') {
      return NextResponse.json({ error: "Invalid repository format." }, { status: 400 });
    }

    const [owner, repo] = repoFullName.split("/");
    if (!owner || !repo) {
      return NextResponse.json({ error: "Could not parse owner and repo." }, { status: 400 });
    }

    try {
      const octokit = await getInstallationOctokit(installationId);
      await octokit.rest.repos.get({ owner, repo });
    } catch (e) {
      return NextResponse.json({ error: "Unauthorized repository." }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    
    const { data, error, count } = await supabase
      .from("jira_notifications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("installation_id", installationId)
      .eq("repo_full_name", repoFullName)
      .eq("status", currentStatus)
      .select();

    if (error) {
      console.error("Supabase update error:", error.message);
      return NextResponse.json({ error: "Failed to update notification." }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Notification not found or already processed." }, { status: 404 });
    }

    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (error: any) {
    console.error("Jira notification update error:", error.message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
