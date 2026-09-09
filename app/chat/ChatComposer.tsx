"use client";

import { useState } from "react";

export function ChatComposer() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<{ message: string; prompt: string; ai_response?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setApprovalStatus(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "An error occurred.");
      } else {
        setResponse({ message: data.message, prompt: data.prompt, ai_response: data.ai_response });
        if (data.ai_response) {
          setApprovalStatus('pending');
        }
        setMessage("");
      }
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="composer">
        <textarea
          placeholder="Describe the code change you want..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isLoading}
        ></textarea>
        <button
          className="button primary"
          onClick={handleSubmit}
          disabled={!message.trim() || isLoading}
        >
          {isLoading ? "Analyzing..." : "Analyze repository →"}
        </button>
      </div>
      <small className="hint">The first stage is read-only. Code changes require your plan approval.</small>

      {error && (
        <div style={{ marginTop: '12px', padding: '12px', background: '#ffe6e6', color: '#cc0000', borderRadius: '4px', fontSize: '14px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div style={{ marginTop: '12px', padding: '12px', background: '#e6ffe6', color: '#006600', borderRadius: '4px', fontSize: '14px' }}>
          <strong>{response.message}</strong><br />
          <span style={{ opacity: 0.8 }}>Received prompt: {response.prompt}</span>
          {response.ai_response && (
            <div style={{ marginTop: '12px', padding: '12px', background: '#ffffff', color: '#333', borderRadius: '4px', border: '1px solid #ccc', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              <strong>AI Response:</strong><br />
              {response.ai_response}
              
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                {approvalStatus === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); setApprovalStatus('approved'); }}
                      style={{ padding: '8px 16px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Approve Plan
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); setApprovalStatus('rejected'); }}
                      style={{ padding: '8px 16px', background: '#cc0000', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Reject Plan
                    </button>
                  </div>
                )}
                {approvalStatus === 'approved' && (
                  <div style={{ padding: '8px', background: '#e6ffe6', color: '#006600', borderRadius: '4px', fontWeight: 'bold' }}>
                    Plan approved. Ready to implement.
                  </div>
                )}
                {approvalStatus === 'rejected' && (
                  <div style={{ padding: '8px', background: '#ffe6e6', color: '#cc0000', borderRadius: '4px', fontWeight: 'bold' }}>
                    Plan rejected.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
