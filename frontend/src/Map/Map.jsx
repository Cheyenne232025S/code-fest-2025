import React, { useEffect, useState } from "react";
import "./Map.css";
import MapHeader from "./mapHeader";
import Sidebar from "./sidebar";
import MapImage from "./mapImage";

export default function Map() {
  const [submission, setSubmission] = useState(null);

  useEffect(() => {
    const rawSession = sessionStorage.getItem("surveySubmission");
    const rawLocal = localStorage.getItem("surveyResponses");
    let parsed = null;

    try {
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
      console.error("Failed to parse survey data:", err);
    }

    setSubmission(parsed);
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