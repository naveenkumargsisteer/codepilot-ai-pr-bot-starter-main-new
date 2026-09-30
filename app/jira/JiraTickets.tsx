"use client";

import { useState, useEffect, useCallback } from "react";

type JiraTicket = {
  id: string;
  installation_id: string;
  repo_full_name: string;
  issue_key: string;
  summary: string;
  description: string;
  url: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export function JiraTickets() {
  const [tickets, setTickets] = useState<JiraTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState("updated_desc");

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jira/tickets?sort=${sort}`);
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Failed to load Jira tickets");
        return;
      }

      setTickets(data.tickets || []);
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleRefresh = (e: React.MouseEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "Pending";
      case "processing": return "Processing";
      case "processed": return "Completed";
      case "dismissed": return "Dismissed";
      default: return status;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending": return "badge"; // default style
      case "processing": return "badge blue";
      case "processed": return "badge green";
      case "dismissed": return "badge";
      default: return "badge";
    }
  };

  return (
    <div style={{ maxWidth: "800px" }}>
      <div style={{ marginBottom: "20px" }}>
        <p className="muted">Track Jira issues received by CodePilot.</p>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <label htmlFor="sortTickets" style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>Sort by:</label>
          <select 
            id="sortTickets"
            value={sort} 
            onChange={(e) => setSort(e.target.value)}
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", background: "white" }}
          >
            <option value="updated_desc">Updated — newest first</option>
            <option value="updated_asc">Updated — oldest first</option>
            <option value="created_desc">Created — newest first</option>
            <option value="created_asc">Created — oldest first</option>
          </select>
        </div>
        
        <button onClick={handleRefresh} className="button" disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#ffe6e6', color: '#cc0000', borderRadius: '4px', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && tickets.length === 0 && (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>No Jira tickets yet</h3>
          <p style={{ margin: 0, color: '#6c757d' }}>New Jira issues received by CodePilot will appear here.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {tickets.map(ticket => (
          <div key={ticket.id} style={{ padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>{ticket.issue_key}</h3>
                  <span className={getStatusBadgeClass(ticket.status)}>{getStatusLabel(ticket.status)}</span>
                </div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#334155' }}>{ticket.summary}</h4>
              </div>
              {ticket.url && (
                <a href={ticket.url} target="_blank" rel="noreferrer" className="button" style={{ padding: '6px 12px', fontSize: '13px' }}>
                  View in Jira ↗
                </a>
              )}
            </div>
            
            {ticket.description && (
              <div style={{ margin: '12px 0', padding: '12px', background: '#f8fafc', borderRadius: '4px', fontSize: '14px', color: '#475569', borderLeft: '3px solid #cbd5e1' }}>
                {ticket.description.length > 200 ? `${ticket.description.substring(0, 200)}...` : ticket.description}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
              <span title={new Date(ticket.created_at).toLocaleString()}><strong>Created:</strong> {new Date(ticket.created_at).toLocaleDateString()}</span>
              <span title={new Date(ticket.updated_at).toLocaleString()}><strong>Updated:</strong> {new Date(ticket.updated_at).toLocaleDateString()}</span>
              <span><strong>Repo:</strong> {ticket.repo_full_name}</span>
            </div>
          </div>
        ))}
      </div>
      
      {loading && tickets.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          Loading tickets...
        </div>
      )}
    </div>
  );
}
