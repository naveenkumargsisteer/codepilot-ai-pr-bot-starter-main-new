import { App } from "octokit";

export function getGitHubConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const appId = process.env.GITHUB_APP_ID;
  const appName = process.env.GITHUB_APP_NAME;
  const appSlug = process.env.GITHUB_APP_SLUG;
  
  let privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  return {
    clientId,
    clientSecret,
    appId,
    privateKey,
    appName,
    appSlug,
    isConfigured: !!(clientId && clientSecret && appId && privateKey && appName && appSlug),
  };
}

export function validateGitHubConfig() {
  const config = getGitHubConfig();
  if (!config.isConfigured) {
    throw new Error("GitHub App configuration is missing or incomplete.");
  }
  return config as {
    clientId: string;
    clientSecret: string;
    appId: string;
    privateKey: string;
    appName: string;
    appSlug: string;
    isConfigured: true;
  };
}

export async function getInstallationOctokit(installationId: string | number) {
  const config = validateGitHubConfig();
  
  const app = new App({
    appId: config.appId,
    privateKey: config.privateKey,
  });

  return await app.getInstallationOctokit(Number(installationId));
}
