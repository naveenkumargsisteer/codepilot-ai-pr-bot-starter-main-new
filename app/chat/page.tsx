import Link from "next/link";
import { cookies } from "next/headers";
import { ChatComposer } from "./ChatComposer";

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
        <ChatComposer />
      </section>
    </main>
  );
}