import React, { useEffect, useState } from "react";
import "./sidebar.css";

function Sidebar() {
  const [submission, setSubmission] = useState(null);

  // LLM fetch state
  const [llmData, setLlmData] = useState(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState(null);

  const fetchLLM = async () => {
    setLlmLoading(true);
    setLlmError(null);
    try {
      const res = await fetch("http://localhost:8000/llm/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      // backend returns { status, message, data }
      setLlmData(json.data ?? JSON.stringify(json));
    } catch (err) {
      setLlmError(err.message || String(err));
    } finally {
      setLlmLoading(false);
    }
  };

  useEffect(() => {
    // No local/session storage usage here.
    // If you want to populate `submission` from the backend, perform a fetch call
    // to an API endpoint (e.g. GET /results) and call setSubmission(response).
    setSubmission(null);
  }, []);

  return (
    <div className="sidebar-container">
      <h1>Sidebar</h1>

      {/* LLM section: button to fetch and display /llm/ data */}
      <div style={{ marginBottom: 12 }}>
        <button className="btn btn-outline" onClick={fetchLLM} disabled={llmLoading}>
          {llmLoading ? "Loading…" : "Fetch LLM recommendations"}
        </button>
        {llmError && <div style={{ color: "crimson", marginTop: 8 }}>Error: {llmError}</div>}
        {llmData && (
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: 8 }}>
            {typeof llmData === "string" ? llmData : JSON.stringify(llmData, null, 2)}
          </pre>
        )}
      </div>

      {/* short decorative divider (65px line + content) */}
      <div
        className="divider"
        tabIndex="0"
        role="separator"
        aria-orientation="horizontal"
      >
        <span className="divider-line" aria-hidden="true" />
        <div className="divider-content">
          {/* print submission here */}
          {submission ? (
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
              {JSON.stringify(submission, null, 2)}
            </pre>
          ) : (
            <div> No survey data found. Submit the survey to populate this section. </div>
          )}
        </div>
      </div>

      {/* ...existing code... */}

      {/* another divider example */}
      <div
        className="divider"
        tabIndex="0"
        role="separator"
        aria-orientation="horizontal"
      >
        <span className="divider-line" aria-hidden="true" />
        <div className="divider-content">
          <p>Additional section content.</p>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;