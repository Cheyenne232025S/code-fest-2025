import React, { useEffect, useState } from "react";
import "./Map.css";
import MapHeader from "./mapHeader";
import Sidebar from "./sidebar";
import MapImage from "./mapImage";

export default function Map() {
  const [submission, setSubmission] = useState(null);

  useEffect(() => {
    // No local/session storage usage — do not read persisted client data here.
    // If you want to retrieve results from the backend, implement a fetch call here
    // to an API endpoint (e.g. GET /results) and setSubmission with the response.
    setSubmission(null);
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