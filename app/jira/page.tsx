import Link from "next/link";
import { JiraTickets } from "./JiraTickets";

export default function JiraPage() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="logo">⌁</span> CodePilot</div>
        <nav>
          <Link className="nav" href="/">Dashboard</Link>
          <Link className="nav" href="/chat">AI Chat</Link>
          <Link className="nav active" href="/jira">Jira Tickets</Link>
          <Link className="nav" href="/connections">Connections</Link>
          <Link className="nav" href="/settings">Settings</Link>
        </nav>
      </aside>
      <section className="content">
        <header className="topbar">
          <div>
            <div className="eyebrow">Workspace</div>
            <h1>Jira Tickets</h1>
          </div>
        </header>
        <JiraTickets />
      </section>
    </main>
  );
}
