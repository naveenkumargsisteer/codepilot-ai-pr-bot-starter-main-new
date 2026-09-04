import Link from "next/link";
import { cookies, headers } from "next/headers";
import { Suspense } from "react";
import { selectRepository } from "./actions";

async function RepoFetcher() {
  const headersList = await headers();
  const cookieStore = await cookies();
  const selectedRepoCookie = cookieStore.get('selected_repo')?.value;
  let selectedRepoId = null;
  if (selectedRepoCookie) {
    try {
      selectedRepoId = JSON.parse(selectedRepoCookie).id;
    } catch (e) {
      // ignore
    }
  }

  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const apiUrl = `${protocol}://${host}/api/github/repositories`;
  
  try {
    const res = await fetch(apiUrl, {
      headers: {
        cookie: headersList.get("cookie") || "",
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return (
        <div style={{ padding: '12px', background: '#ffe6e6', color: '#cc0000', marginTop: '16px', borderRadius: '4px', gridColumn: '1 / -1' }}>
          API Error: {errorData.error || `Failed to fetch repositories (${res.status})`}
        </div>
      );
    }

    const data = await res.json();
    const repositories = data.repositories || [];

    if (repositories.length === 0) {
      return <div style={{ padding: '12px', gridColumn: '1 / -1' }}>No repositories found.</div>;
    }

    return (
      <>
        {repositories.map((repo: any) => {
          const isSelected = selectedRepoId && String(selectedRepoId) === String(repo.id);
          return (
            <div key={repo.id} className="repoCard" style={isSelected ? { border: '2px solid #0070f3', background: '#f4faff' } : {}}>
              <div className="repoIcon" style={{ background: '#24292e', color: 'white' }}>GH</div>
              <div className="repoMain">
                <h4>
                  <a href={repo.html_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                    {repo.name}
                  </a>
                </h4>
                <p>{repo.full_name}</p>
                <div className="meta">
                  <span className="status">● {repo.private ? 'Private' : 'Public'}</span>
                  <span className="status" style={{ marginLeft: '12px' }}>Branch: {repo.default_branch}</span>
                </div>
              </div>
              <form action={selectRepository} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                <input type="hidden" name="id" value={repo.id} />
                <input type="hidden" name="name" value={repo.name} />
                <input type="hidden" name="full_name" value={repo.full_name} />
                <input type="hidden" name="html_url" value={repo.html_url} />
                <input type="hidden" name="default_branch" value={repo.default_branch} />
                <button type="submit" className="button" style={isSelected ? { background: '#0070f3', color: 'white', border: 'none' } : {}}>
                  {isSelected ? 'Selected' : 'Select'}
                </button>
              </form>
            </div>
          );
        })}
      </>
    );
  } catch (err: any) {
    return (
      <div style={{ padding: '12px', background: '#ffe6e6', color: '#cc0000', marginTop: '16px', borderRadius: '4px', gridColumn: '1 / -1' }}>
        Failed to connect to API: {err.message}
      </div>
    );
  }
}

export default async function Connections({
  searchParams,
}: {
  searchParams: Promise<{ github?: string; error?: string }>;
}) {
  const { github, error } = await searchParams;
  const cookieStore = await cookies();
  const installationId = cookieStore.get("github_installation_id")?.value;

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">⌁</span> CodePilot
        </div>
        <nav>
          <Link className="nav" href="/">Dashboard</Link>
          <Link className="nav" href="/chat">AI Chat</Link>
          <Link className="nav active" href="/connections">MY Connections</Link>
          <Link className="nav" href="/settings">Settings</Link>
        </nav>
      </aside>
      <section className="content">
        <header className="topbar">
          <div>
            <div className="eyebrow">Repositories</div>
            <h1>Connections</h1>
          </div>
          <Link href="/connections/new" className="button primary">
            + Connect repository
          </Link>
        </header>

        {github === "connected" && (
          <div style={{ padding: '12px', background: '#e6ffe6', color: '#006600', marginBottom: '16px', borderRadius: '4px' }}>
            GitHub connected successfully.
          </div>
        )}

        {error && (
          <div style={{ padding: '12px', background: '#ffe6e6', color: '#cc0000', marginBottom: '16px', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        {installationId && (
          <div style={{ padding: '12px', background: '#e6f2ff', color: '#004080', marginBottom: '16px', borderRadius: '4px' }}>
            Temporary Debug: Cookie installation ID is {installationId}
          </div>
        )}

        <div className="cards">
          {installationId ? (
            <>
              <div className="repoCard" style={{ border: '2px solid #0070f3' }}>
                <div className="repoIcon">GH</div>
                <div className="repoMain">
                  <h4>GitHub Connection Active</h4>
                  <p>Installation ID: {installationId}</p>
                  <div className="meta">
                    <span className="status">● Connected</span>
                  </div>
                </div>
              </div>
              <Suspense fallback={<div style={{ padding: '12px', color: '#666', gridColumn: '1 / -1' }}>Loading repositories...</div>}>
                <RepoFetcher />
              </Suspense>
            </>
          ) : (
            <div className="repoCard" style={{ opacity: 0.6 }}>
              <div className="repoIcon" style={{ filter: 'grayscale(1)' }}>GH</div>
              <div className="repoMain">
                <h4>No Connection</h4>
                <p>GitHub App is not connected</p>
                <div className="meta">
                  <span className="status" style={{ color: '#666' }}>○ Disconnected</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}