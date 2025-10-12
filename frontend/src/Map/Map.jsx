import React, { useEffect, useState } from "react";
import "./Map.css";
import MapHeader from "./mapHeader";
import Sidebar from "./sidebar";
import MapImage from "./mapImage";

export default function Map() {
  const [submission, setSubmission] = useState(null);

  useEffect(() => {
    // Fetch latest submission from backend (no local/session storage)
    let cancelled = false;
    const fetchResults = async () => {
      try {
        const res = await fetch("http://localhost:8000/results/");
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          // backend returns either {status: "no_data", ...} or the saved payload
          setSubmission(json.status === "no_data" ? null : json);
        }
      } catch (err) {
        console.error("Failed to fetch results:", err);
        if (!cancelled) setSubmission(null);
      }
    };
    fetchResults();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="map-container">
      <MapHeader />
      <MapImage />
      <Sidebar />
      <h1>Map Site</h1>
      {submission ? (
        <div style={{ marginTop: 16 }}>
          <h2>Received survey data</h2>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {JSON.stringify(submission, null, 2)}
          </pre>
        </div>
      ) : (
        <p style={{ marginTop: 16 }}>No survey data found. Submit the survey to see results here.</p>
      )}
    </div>
  );
}