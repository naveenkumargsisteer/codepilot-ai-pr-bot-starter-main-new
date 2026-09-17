"use client";

import { useState } from "react";
import { DiffViewer } from "./DiffViewer";

export function ChatComposer() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isImplementing, setIsImplementing] = useState(false);
  const [response, setResponse] = useState<{ message: string; prompt: string; ai_response?: string; context?: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [proposedChanges, setProposedChanges] = useState<any[] | null>(null);
  const [changesApprovalStatus, setChangesApprovalStatus] = useState<'pending' | 'approved' | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [isWriting, setIsWriting] = useState(false);
  const [writeResult, setWriteResult] = useState<{ branch: string; commitSha: string; changedFiles: string[] } | null>(null);
  const [isCreatingPr, setIsCreatingPr] = useState(false);
  const [prResult, setPrResult] = useState<{ number: number; url: string; title: string; head: string; base: string; message: string } | null>(null);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  const hasResults = !!error || !!response || !!proposedChanges;
  const hasCodeChangePlan = response?.ai_response ? (response.ai_response.includes('PLAN') || response.ai_response.includes('FILES TO CHANGE')) : false;
  const isReviewMode = proposedChanges && proposedChanges.length > 0 && changesApprovalStatus === 'pending';

  const handleSubmit = async (overrideMessage?: string | React.MouseEvent) => {
    const textToSubmit = typeof overrideMessage === 'string' ? overrideMessage : message;
    if (!textToSubmit.trim()) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setApprovalStatus(null);
    setProposedChanges(null);
    setChangesApprovalStatus(null);
    setWriteResult(null);
    setPrResult(null);
    setIsMobileModalOpen(false);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: textToSubmit }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "An error occurred.");
      } else {
        setResponse({ message: data.message, prompt: data.prompt, ai_response: data.ai_response, context: data.context });
        if (data.ai_response) {
          setApprovalStatus('pending');
        }
        setMessage("");
      }
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setIsLoading(false);
      setIsMobileModalOpen(true);
    }
  };

  const handleTryAgain = () => {
    if (response?.prompt) {
      setMessage(response.prompt);
      handleSubmit(response.prompt);
    }
  };

  const handleApprovePlan = async () => {
    setApprovalStatus('approved');
    setIsImplementing(true);
    setError(null);

    try {
      const res = await fetch("/api/chat/implement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: response?.prompt,
          plan: response?.ai_response,
          context: response?.context
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate changes.");
      } else {
        setProposedChanges(data.changes);
        setChangesApprovalStatus('pending');
      }
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setIsImplementing(false);
      setIsMobileModalOpen(true);
    }
  };

  const handleApproveChanges = async () => {
    setIsWriting(true);
    setError(null);
    setWriteResult(null);
    setPrResult(null);

    try {
      const res = await fetch("/api/chat/write", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changes: proposedChanges,
          request: response?.prompt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || data.details || "Failed to write changes to GitHub.");
      } else {
        setChangesApprovalStatus('approved');
        setWriteResult({
          branch: data.branch,
          commitSha: data.commitSha,
          changedFiles: data.changedFiles,
        });
      }
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setIsWriting(false);
    }
  };

  const handleCancelReview = () => {
    setProposedChanges(null);
    setChangesApprovalStatus(null);
  };

  const handleCreatePr = async () => {
    if (!writeResult) return;
    
    setIsCreatingPr(true);
    setError(null);

    try {
      const res = await fetch("/api/chat/pr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branch: writeResult.branch,
          request: response?.prompt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || data.details || "Failed to create Pull Request.");
      } else {
        setPrResult({
          message: data.message,
          number: data.pull_request.number,
          url: data.pull_request.url,
          title: data.pull_request.title,
          head: data.pull_request.head,
          base: data.pull_request.base,
        });
      }
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setIsCreatingPr(false);
    }
  };

  return (
    <div className={`chatLayout ${isReviewMode ? 'review-mode' : ''}`}>
      <div className={`resultsBox ${isMobileModalOpen ? 'open' : ''}`}>
        {hasResults && !isReviewMode && (
           <button className="closeModalBtn" onClick={() => setIsMobileModalOpen(false)}>Close Results</button>
        )}
        
        {!hasResults && !isReviewMode && (
          <div style={{ color: '#999', textAlign: 'center', marginTop: '40px' }}>No analysis results yet.</div>
        )}

        {error && (
          <div style={{ marginTop: '12px', padding: '12px', background: '#ffe6e6', color: '#cc0000', borderRadius: '4px', fontSize: '14px' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {response && response.ai_response?.includes('AI_ERROR_429') && (
          <div style={{ marginTop: '12px', padding: '16px', background: '#fff3cd', color: '#856404', borderRadius: '4px', border: '1px solid #ffeeba', fontSize: '14px' }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>⚠️</span> AI request limit reached
            </h3>
            <p>Gemini is temporarily rate-limiting requests. Please wait a moment and try again.</p>
            <p style={{ opacity: 0.8, fontSize: '13px' }}>Your repository and GitHub connection are still active.</p>
            <button
              onClick={handleTryAgain}
              style={{ marginTop: '12px', padding: '8px 16px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              disabled={isLoading}
            >
              {isLoading ? "Retrying..." : "Try Again"}
            </button>
          </div>
        )}

        {response && !response.ai_response?.includes('AI_ERROR_429') && (
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
                      {hasCodeChangePlan ? (
                        <>
                          <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); handleApprovePlan(); }}
                            style={{ padding: '8px 16px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}
                            disabled={isImplementing}
                          >
                            {isImplementing ? "Generating code..." : "Approve Plan"}
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); setApprovalStatus('rejected'); }}
                            style={{ padding: '8px 16px', background: '#cc0000', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}
                            disabled={isImplementing}
                          >
                            Reject Plan
                          </button>
                        </>
                      ) : (
                        <button 
                          type="button"
                          onClick={(e) => { e.preventDefault(); setResponse(null); setError(null); setIsMobileModalOpen(false); }}
                          style={{ padding: '8px 16px', background: '#666', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Ok, got it
                        </button>
                      )}
                    </div>
                  )}
                  {approvalStatus === 'approved' && !proposedChanges && !isImplementing && (
                    <div style={{ padding: '8px', background: '#e6ffe6', color: '#006600', borderRadius: '4px', fontWeight: 'bold' }}>
                      Plan approved. Ready to implement.
                    </div>
                  )}
                  {isImplementing && (
                    <div style={{ padding: '8px', background: '#fff3cd', color: '#856404', borderRadius: '4px', fontWeight: 'bold' }}>
                      Generating code changes... Please wait.
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

        {proposedChanges && (
          <div className={isReviewMode ? "fullscreen-review" : ""} style={!isReviewMode ? { marginTop: '12px', padding: '12px', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #ddd' } : {}}>
            {isReviewMode && (
              <div className="review-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px' }}>Review Proposed Changes</h3>
                  <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic', margin: '4px 0 0 0' }}>Review and approve the changes before writing to GitHub.</p>
                </div>
              </div>
            )}
            {!isReviewMode && (
              <>
                <h3>Proposed changes</h3>
                <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>No changes have been written to GitHub yet.</p>
              </>
            )}
            
            {proposedChanges.length > 0 && (
              <div className="proposed-changes-container">
                <div className="file-list">
                  {proposedChanges.map((change, idx) => (
                    <div 
                      key={idx} 
                      className={`file-list-item ${selectedFileIndex === idx ? 'active' : ''}`}
                      onClick={() => setSelectedFileIndex(idx)}
                    >
                      <span className="file-icon">📄</span>
                      <span className="file-path">{change.path}</span>
                      <span className={`file-action ${change.action}`}>{change.action}</span>
                    </div>
                  ))}
                </div>
                <div className="file-diff-view">
                  <DiffViewer 
                    oldContent={proposedChanges[selectedFileIndex]?.action === 'create' ? '' : (response?.context?.files?.[proposedChanges[selectedFileIndex]?.path] || '')}
                    newContent={proposedChanges[selectedFileIndex]?.content || ''}
                  />
                </div>
              </div>
            )}

            <div className={isReviewMode ? "review-actions" : ""} style={!isReviewMode ? { marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #ddd' } : {}}>
              {changesApprovalStatus === 'pending' && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleCancelReview(); }}
                    style={{ padding: '10px 20px', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold' }}
                    disabled={isWriting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleApproveChanges(); }}
                    style={{ padding: '10px 20px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold' }}
                    disabled={isWriting}
                  >
                    {isWriting ? "Writing to GitHub..." : "Approve Changes"}
                  </button>
                </div>
              )}
              {changesApprovalStatus === 'approved' && writeResult && (
                <div style={{ padding: '8px', background: '#e6ffe6', color: '#006600', borderRadius: '4px' }}>
                  <strong>Changes written to GitHub.</strong><br />
                  Branch: {writeResult.branch}<br />
                  Commit: {writeResult.commitSha}<br />
                  Files: {writeResult.changedFiles.join(", ")}
                </div>
              )}
              
              {changesApprovalStatus === 'approved' && writeResult && !prResult && (
                <div style={{ marginTop: '16px' }}>
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleCreatePr(); }}
                    style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}
                    disabled={isCreatingPr}
                  >
                    {isCreatingPr ? "Creating Pull Request..." : "Create Pull Request"}
                  </button>
                </div>
              )}
              
              {prResult && (
                <div style={{ marginTop: '16px', padding: '12px', background: '#e6f7ff', color: '#005580', borderRadius: '4px', border: '1px solid #b3e6ff' }}>
                  <strong>{prResult.message}</strong><br />
                  <div style={{ marginTop: '8px', fontSize: '14px' }}>
                    <strong>#{prResult.number}:</strong> {prResult.title}<br />
                    <span style={{ color: '#666' }}><code>{prResult.head}</code> → <code>{prResult.base}</code></span>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <a href={prResult.url} target="_blank" rel="noreferrer" style={{ padding: '6px 12px', background: '#0066cc', color: 'white', textDecoration: 'none', borderRadius: '4px', fontSize: '14px', display: 'inline-block' }}>
                      View Pull Request
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="chatBox">
        <div className="message bot"><div><b>CodePilot</b><p>Tell me what you want to change. I’ll analyze the repository and create a plan before touching your code.</p></div></div>
        <div className="examplePrompt">Try: <span>Add Google OAuth login and store the Google account ID on the user model.</span></div>
        <div className="composer">
          <textarea
            placeholder="Describe the code change you want..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isLoading || isImplementing}
          ></textarea>
          <button
            className="button primary"
            onClick={handleSubmit}
            disabled={!message.trim() || isLoading || isImplementing}
          >
            {isLoading ? "Analyzing..." : "Analyze repository →"}
          </button>
        </div>
        <small className="hint">The first stage is read-only. Code changes require your plan approval.</small>
      </div>
    </div>
  );
}
