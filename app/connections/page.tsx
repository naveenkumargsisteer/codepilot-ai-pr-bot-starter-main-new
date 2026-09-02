import Link from "next/link";

export default async function Connections({
  searchParams,
}: {
  searchParams: Promise<{ github?: string; error?: string; installation_id?: string }>;
}) {
  const { github, error, installation_id } = await searchParams;

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

        {installation_id && (
          <div style={{ padding: '12px', background: '#e6f2ff', color: '#004080', marginBottom: '16px', borderRadius: '4px' }}>
            Installation ID received: {installation_id}
          </div>
        )}

        <div className="cards">
          <div className="repoCard">
            <div className="repoIcon">GH</div>
            <div className="repoMain">
              <h4>E-commerce API</h4>
              <p>acme/ecommerce-api</p>
              <div className="meta">
                <span>◉ main</span>
                <span className="status">● Connected</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}