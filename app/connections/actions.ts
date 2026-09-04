'use server';
import { cookies } from "next/headers";

export async function selectRepository(formData: FormData) {
  const id = formData.get('id');
  const name = formData.get('name');
  const full_name = formData.get('full_name');
  const html_url = formData.get('html_url');
  const default_branch = formData.get('default_branch');
  
  if (id && name) {
    const repoData = JSON.stringify({ id, name, full_name, html_url, default_branch });
    const cookieStore = await cookies();
    cookieStore.set('selected_repo', repoData, { httpOnly: true, path: '/' });
  }
}
