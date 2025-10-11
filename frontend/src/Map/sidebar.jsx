import React, { useEffect, useState } from "react";
import "./sidebar.css";

function Sidebar() {
  const [submission, setSubmission] = useState(null);

  useEffect(() => {
    let parsed = null;
    try {
      const rawSession = sessionStorage.getItem("surveySubmission");
      const rawLocal = localStorage.getItem("surveyResponses");

      if (rawSession) {
        parsed = JSON.parse(rawSession);
        if (parsed && typeof parsed === "object") {
          if (parsed.data) parsed = parsed.data;
          else if (parsed.summary) parsed = parsed.summary;
        }
      } else if (rawLocal) {
        const arr = JSON.parse(rawLocal);
        if (Array.isArray(arr) && arr.length > 0) parsed = arr[0];
      }
    } catch (err) {
      console.error("Failed to parse survey data in Sidebar:", err);
    }
    setSubmission(parsed);
  }, []);

  return (
    <div className="sidebar-container">
      <h1>Sidebar</h1>
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