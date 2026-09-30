import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "../../../../lib/supabase";
import { getInstallationOctokit } from "../../../../lib/github";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const selectedRepoCookie = cookieStore.get("selected_repo")?.value;
    const installationId = cookieStore.get("github_installation_id")?.value;

    if (!selectedRepoCookie || !installationId) {
      return NextResponse.json({ error: "Unauthorized or no repository selected." }, { status: 401 });
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
    
    const { data, error } = await supabase
      .from("jira_notifications")
      .select("*")
      .eq("installation_id", installationId)
      .eq("repo_full_name", repoFullName)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase query error:", error.message);
      return NextResponse.json({ error: "Failed to fetch notifications." }, { status: 500 });
    }

    return NextResponse.json({ notifications: data }, { status: 200 });
  } catch (error: any) {
    console.error("Jira notification fetch error:", error.message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
