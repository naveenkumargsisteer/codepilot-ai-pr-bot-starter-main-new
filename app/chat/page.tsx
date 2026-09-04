import Link from "next/link";
import { cookies } from "next/headers";

export default async function ChatPage() {
  const cookieStore = await cookies();
  const selectedRepoCookie = cookieStore.get('selected_repo')?.value;
  let selectedRepo = null;
  
  if (selectedRepoCookie) {
    try {
      selectedRepo = JSON.parse(selectedRepoCookie);
    } catch (e) {
      // ignore parsing error
    }
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="logo">⌁</span> CodePilot</div>
        <nav>
          <Link className="nav" href="/">Dashboard</Link><Link className="nav active" href="/chat">AI Chat</Link>
          <Link className="nav" href="/connections">Connections</Link><Link className="nav" href="/settings">Settings</Link>
        </nav>
      </aside>
      <section className="content chatPage">
        <header className="topbar"><div><div className="eyebrow">AI Agent</div><h1>New coding task</h1></div><span className="connectionChip">● {selectedRepo ? `${selectedRepo.name} · ${selectedRepo.default_branch}` : 'No repository selected'}</span></header>
        <div className="chatLayout">
          <div className="chatBox">
            <div className="message bot"><div className="avatar botAvatar">AI</div><div><b>CodePilot</b><p>Tell me what you want to change. I’ll analyze the repository and create a plan before touching your code.</p></div></div>
            <div className="examplePrompt">Try: <span>Add Google OAuth login and store the Google account ID on the user model.</span></div>
            <div className="composer"><textarea placeholder="Describe the code change you want..."></textarea><button className="button primary">Analyze repository →</button></div>
            <small className="hint">The first stage is read-only. Code changes require your plan approval.</small>
          </div>
          <aside className="taskAside"><h3>Workflow</h3><div className="step done"><b>01</b><div><strong>Request</strong><small>Describe the change</small></div></div><div className="step activeStep"><b>02</b><div><strong>Analyze & plan</strong><small>Repository inspection</small></div></div><div className="step"><b>03</b><div><strong>Approval</strong><small>You approve the plan</small></div></div><div className="step"><b>04</b><div><strong>Implement</strong><small>Sandboxed agent</small></div></div><div className="step"><b>05</b><div><strong>Pull request</strong><small>Branch + PR link</small></div></div></aside>
        </div>
      </section>
    </main>
  );
}