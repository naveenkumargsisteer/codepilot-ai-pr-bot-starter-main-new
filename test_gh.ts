import { getInstallationOctokit } from "./lib/github";
import { loadEnvConfig } from "@next/env";
import { App } from "octokit";

loadEnvConfig(process.cwd());

async function run() {
  try {
    const app = new App({
      appId: process.env.GITHUB_APP_ID as string,
      privateKey: (process.env.GITHUB_APP_PRIVATE_KEY as string).replace(/\\n/g, '\n'),
    });
    
    let installationId;
    try {
      const { data: installations } = await app.octokit.rest.apps.listInstallations();
      installationId = installations[0].id;
    } catch (e: any) {
      console.log("Error fetching installations:", e.message);
      return;
    }

    let octokit;
    try {
      octokit = await getInstallationOctokit(installationId);
    } catch (e: any) {
      console.log('\n--- DIAGNOSTIC INFORMATION ---');
      console.log('3. Failure happens while creating the installation authentication/token.');
      console.log('1. HTTP status code:', e.status);
      console.log('2. GitHub error message:', e.message);
      return;
    }

    try {
      await octokit.rest.apps.listReposAccessibleToInstallation({ per_page: 100 });
      console.log('\n--- DIAGNOSTIC INFORMATION ---');
      console.log('Successfully fetched repositories! Wait, is there an error? If this succeeds, the real issue might be the cookie.');
    } catch (e: any) {
      console.log('\n--- DIAGNOSTIC INFORMATION ---');
      console.log('3. Failure happens while calling listReposAccessibleToInstallation.');
      console.log('1. HTTP status code:', e.status);
      console.log('2. GitHub error message:', e.message);
    }

  } catch (error: any) {
    console.log("Unexpected error:", error);
  }
}

run();
