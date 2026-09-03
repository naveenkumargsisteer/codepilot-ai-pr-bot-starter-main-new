import Link from "next/link";
import { cookies } from "next/headers";

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
          <Link className="nav active" href="/connections">Connections</Link>
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
            <div className="repoCard">
              <div className="repoIcon">GH</div>
              <div className="repoMain">
                <h4>GitHub Connection Active</h4>
                <p>Installation ID: {installationId}</p>
                <div className="meta">
                  <span className="status">● Connected</span>
                </div>
              </div>
            </div>
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