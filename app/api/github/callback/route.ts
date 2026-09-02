import { NextResponse, NextRequest } from "next/server";
import { getGitHubConfig } from "../../../../lib/github";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  const setupAction = searchParams.get("setup_action");
  const installationId = searchParams.get("installation_id");

  const config = getGitHubConfig();
  if (!config.isConfigured) {
    return NextResponse.redirect(new URL("/connections?error=GitHub+configuration+missing", request.url));
  }

  if (error || setupAction === "cancel") {
    return NextResponse.redirect(new URL("/connections?error=GitHub+installation+cancelled", request.url));
  }

  if (!installationId) {
    return NextResponse.redirect(new URL("/connections?error=Missing+installation+ID", request.url));
  }

  // Currently not saving the installation ID or repositories.
  return NextResponse.redirect(new URL(`/connections?github=connected&installation_id=${installationId}`, request.url));
}
