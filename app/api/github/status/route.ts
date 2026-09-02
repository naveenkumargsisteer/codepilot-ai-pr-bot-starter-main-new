import { NextResponse } from "next/server";
import { getGitHubConfig } from "../../../../lib/github";

export async function GET() {
  const config = getGitHubConfig();
  
  return NextResponse.json({
    configured: config.isConfigured,
    checks: {
      GITHUB_APP_ID: !!config.appId,
      GITHUB_APP_SLUG: !!config.appSlug,
      GITHUB_APP_NAME: !!config.appName,
      GITHUB_CLIENT_ID: !!config.clientId,
      GITHUB_CLIENT_SECRET: !!config.clientSecret,
      GITHUB_APP_PRIVATE_KEY: !!config.privateKey
    }
  });
}
