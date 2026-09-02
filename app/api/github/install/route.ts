import { NextResponse } from "next/server";
import { getGitHubConfig } from "../../../../lib/github";

export async function GET() {
  const config = getGitHubConfig();
  
  if (!config.appSlug) {
    return NextResponse.json({ error: "GitHub configuration missing" }, { status: 500 });
  }

  const installUrl = `https://github.com/apps/${config.appSlug}/installations/new`;
  return NextResponse.redirect(installUrl);
}
