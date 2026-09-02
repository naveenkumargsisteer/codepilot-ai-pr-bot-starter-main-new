import Link from "next/link";

export default function NewConnection() {
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
        </nav>
      </aside>
      <section className="content narrow">
        <header className="topbar">
          <div>
            <div className="eyebrow">Repository setup</div>
            <h1>Connect GitHub</h1>
          </div>
        </header>
        <div className="formCard">
          <div className="githubConnect">
            <div className="repoIcon big">GH</div>
            <div>
              <h2>GitHub repository</h2>
              <p>For production, use a GitHub App/OAuth flow instead of storing personal access tokens.</p>
            </div>
          </div>
          <div className="formActions">
            <Link href="/connections" className="button">
              Cancel
            </Link>
            <a href="/api/github/install" className="button primary">
              Connect GitHub
            </a>
          </div>
          <div className="notice">
            Supabase can store the connection metadata. Keep GitHub secrets server-side and encrypted.
          </div>
        </div>
      </section>
    </main>
  );
}