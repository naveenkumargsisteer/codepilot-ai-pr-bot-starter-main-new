'use server';
import { cookies } from "next/headers";
import { getInstallationOctokit } from "../../lib/github";
import { getSupabaseAdmin } from "../../lib/supabase";

export async function selectRepository(formData: FormData) {
  const id = formData.get('id');
  const name = formData.get('name') as string;
  const full_name = formData.get('full_name') as string;
  const html_url = formData.get('html_url') as string;
  const default_branch = formData.get('default_branch') as string;
  
  if (id && name && full_name) {
    const cookieStore = await cookies();
    const installationId = cookieStore.get('github_installation_id')?.value;
    
    if (installationId) {
      const [owner, repoName] = full_name.split('/');
      if (owner && repoName) {
        try {
          const octokit = await getInstallationOctokit(installationId);
          // Verify repository authorization
          await octokit.rest.repos.get({ owner, repo: repoName });
          
          const supabase = getSupabaseAdmin();
          
          // Check if it already exists to prevent duplicates
          const { data: existing } = await supabase
            .from('repositories')
            .select('id')
            .eq('installation_id', installationId)
            .eq('owner', owner)
            .eq('name', repoName)
            .maybeSingle();
            
          if (!existing) {
            // Dummy UUID for user_id since there is no auth
            const dummyUserId = "00000000-0000-0000-0000-000000000000";
            await supabase.from('repositories').insert({
              user_id: dummyUserId,
              provider: 'github',
              owner: owner,
              name: repoName,
              default_branch: default_branch || 'main',
              installation_id: installationId
            });
          }
        } catch (e) {
          console.error("Repository validation/storage failed:", e);
          throw new Error("Failed to validate or store repository.");
        }
      }
    }

    const repoData = JSON.stringify({ id, name, full_name, html_url, default_branch });
    cookieStore.set('selected_repo', repoData, { httpOnly: true, path: '/' });
  }
}
