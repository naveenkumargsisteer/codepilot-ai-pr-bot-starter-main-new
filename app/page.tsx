import Link from "next/link";

const connections = [
  { name: "E-commerce API", repo: "acme/ecommerce-api", branch: "main", status: "Connected" },
  { name: "Mobile App", repo: "acme/mobile-app", branch: "main", status: "Connected" }
];

export default function Home() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="logo">⌁</span> CodePilot</div>
        <nav>
          <Link className="nav active" href="/">Dashboard</Link>
          <Link className="nav" href="/chat">AI Chat</Link>
          <Link className="nav" href="/connections">Connections</Link>
          <Link className="nav" href="/settings">Settings</Link>
        </nav>
        <div className="sideBottom">
          <div className="profile"><div className="avatar">U</div><div><b>Your workspace</b><small>Free plan</small></div></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><div className="eyebrow">Workspace</div><h1>Dashboard</h1></div>
          <Link href="/connections/new" className="button primary">+ Connect repository</Link>
        </header>

        <div className="hero">
          <div>
            <span className="pill">AI coding agent</span>
            <h2>Turn coding requests into reviewed pull requests.</h2>
            <p>Connect a repository, describe the change in chat, approve the plan, and let the agent prepare a PR.</p>
            <Link href="/chat" className="button primary">Start a coding task →</Link>
          </div>
          <div className="heroFlow">
            <div>01 <span>Prompt</span></div><i>→</i><div>02 <span>Plan</span></div><i>→</i><div>03 <span>Approve</span></div><i>→</i><div>04 <span>PR</span></div>
          </div>
        </div>

        <div className="sectionHead"><div><h3>Repositories</h3><p>Connected projects available to the coding agent.</p></div><Link href="/connections" className="textLink">View all</Link></div>
        <div className="cards">
          {connections.map((c) => (
            <div className="repoCard" key={c.repo}>
              <div className="repoIcon">GH</div>
              <div className="repoMain"><h4>{c.name}</h4><p>{c.repo}</p><div className="meta"><span>◉ {c.branch}</span><span className="status">● {c.status}</span></div></div>
              <Link href="/chat" className="iconButton">→</Link>
            </div>
          ))}
          <Link href="/connections/new" className="repoCard addCard"><div className="addIcon">+</div><div><h4>Connect another repository</h4><p>GitHub repository</p></div></Link>
        </div>

        <div className="sectionHead"><div><h3>Recent tasks</h3><p>Your latest agent activity.</p></div></div>
        <div className="table">
          <div className="tr th"><span>Task</span><span>Repository</span><span>Status</span><span>Updated</span></div>
          <div className="tr"><span>Add dark mode</span><span>mobile-app</span><b className="badge green">PR ready</b><span>Today</span></div>
          <div className="tr"><span>Fix checkout validation</span><span>ecommerce-api</span><b className="badge blue">Planning</b><span>Yesterday</span></div>
        </div>
      </section>
    </main>
  );
}