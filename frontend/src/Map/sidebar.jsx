import React, { useEffect, useState } from "react";
import "./sidebar.css";

function Sidebar() {
  const [submission, setSubmission] = useState(null);

  // LLM fetch state
  const [llmData, setLlmData] = useState(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState(null);
  // New: expanded hotel ids (to show restaurants)
  const [expanded, setExpanded] = useState([]);

  const toggleExpanded = (id) => {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const parseRestaurants = (raw) => {
    if (!raw) return [];
    try {
      if (typeof raw === "string") return JSON.parse(raw);
      if (Array.isArray(raw)) return raw;
      return [];
    } catch (e) {
      console.warn("Failed to parse top_restaurants for hotel:", e);
      return [];
    }
  };

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
      setLlmData(json.data ?? JSON.stringify(json));
    } catch (err) {
      setLlmError(err.message || String(err));
    } finally {
      setLlmLoading(false);
    }
  };

  // const fetchLLM = async () => {
  //   setLlmLoading(true);
  //   setLlmError(null);
  //   try {
  //     const res = await fetch("http://localhost:8000/submit/", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //     });
  //     if (!res.ok) throw new Error(`Status ${res.status}`);
  //     const json = await res.json();
  //     // backend returns { status, message, data }
  //     setLlmData(json.data ?? JSON.stringify(json));
  //   } catch (err) {
  //     setLlmError(err.message || String(err));
  //   } finally {
  //     setLlmLoading(false);
  //   }
  // };

//   const fetchLLM = async () => {
//   setLlmLoading(true);
//   setLlmError(null);
//   try {
//     const res = await fetch("http://localhost:8000/submit/", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//     });
//     if (!res.ok) throw new Error(`Status ${res.status}`);
//     const json = await res.json();
//     setLlmData(json.data ?? JSON.stringify(json));
//   } catch (err) {
//     setLlmError(err.message || String(err));
//   } finally {
//     setLlmLoading(false);
//   }
// };

// const fetchLLM = async (answers) => {
//   setLlmLoading(true);
//   setLlmError(null);
//   try {
//     const payload = {
//       id: Date.now(),
//       timestamp: new Date().toISOString(),
//       answers,
//     };

//     const res = await fetch("http://localhost:8000/submit/", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload), // ✅ Send the payload here
//     });

//     if (!res.ok) throw new Error(`Status ${res.status}`);
//     const json = await res.json();

//     // Your backend returns { status, city, prefs, recommendations, summary }
//     setLlmData(json.summary ?? JSON.stringify(json));
//   } catch (err) {
//     setLlmError(err.message || String(err));
//   } finally {
//     setLlmLoading(false);
//   }
// };

//   const fetchLLM = async () => {
//   setLlmLoading(true);
//   setLlmError(null);

//   try {
//     const res = await fetch("http://localhost:8000/compare/", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         top_hotels: topHotels,     // 👈 your scored hotel list
//         user_prefs: userPrefs      // 👈 transformed survey answers
//       })
//     });

//     if (!res.ok) throw new Error(`Status ${res.status}`);
//     const json = await res.json();
//     setLlmData(json.data ?? JSON.stringify(json));
//   } catch (err) {
//     setLlmError(err.message || String(err));
//   } finally {
//     setLlmLoading(false);
//   }
// };

  useEffect(() => {
    // Fetch latest submission from backend (no local/session storage)
    let cancelled = false;
    const fetchResults = async () => {
      try {
        const res = await fetch("http://localhost:8000/results/");
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setSubmission(json.status === "no_data" ? null : json);
        }
      } catch (err) {
        console.error("Failed to fetch survey data in Sidebar:", err);
        if (!cancelled) setSubmission(null);
      }
    };
    fetchResults();
    return () => {
      cancelled = true;
    };
  }, []);

  // New: render a clean recommendations view when submission has recommendations
  const renderRecommendations = () => {
    if (!submission?.recommendations?.top_hotels) return null;
    const recs = submission.recommendations;
    const hotels = recs.top_hotels;
    const hotelIds = Object.keys(hotels.hotel_name ?? {});
    if (!hotelIds.length) return null;

    return (
      <div style={{ marginBottom: 12,fontFamily: "Playfair Display, serif"  }}>
        <div style={{ marginBottom: 8 }}>
          <strong >Recommendations</strong>
          <div style={{ fontSize: 13, color: "#444", fontFamily: "Playfair Display, serif" }}>
            {submission.city ? `${submission.city}` : null}
            {submission.prefs ? ` — Top ${submission.prefs.top_k ?? "N/A"}` : null}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {hotelIds.map((id) => {
            const name = hotels.hotel_name[id] ?? "Unnamed";
            const score = hotels.score?.[id];
            const neighborhood = hotels.neighborhood?.[id];
            const address = hotels.address?.[id];
            const brand = hotels.brand?.[id];
            const lat = hotels.lat?.[id];
            const lon = hotels.lon?.[id];

            const restaurants = parseRestaurants(hotels.top_restaurants?.[id]);

            return (
              <div
                key={id}
                style={{
                  border: "1px solid #000000",
                  padding: 10,
                  borderRadius: 6,
                  background: "#fff",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#1f2937", fontSize: "1.125rem" }}>{name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                      {brand ? `${brand} • ` : ""}
                      {neighborhood ? `${neighborhood}` : ""}
                      {address ? ` • ${address}` : ""}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                      {typeof score !== "undefined" ? `Score: ${Number(score).toFixed(3)}` : null}
                      {lat && lon ? ` • (${lat.toFixed(5)}, ${lon.toFixed(5)})` : ""}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleExpanded(id)}
                    className="btn btn-outline"
                    style={{ padding: "8px 16px", fontSize: "0.875rem", alignSelf: "flex-start" }}
                  >
                    {expanded.includes(id) ? "Hide restaurants" : `Show ${restaurants.length} restaurants`}
                  </button>
                </div>

                {expanded.includes(id) && (
                  <div style={{ marginTop: 10 }}>
                    {restaurants.length ? (
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {restaurants.map((r, i) => (
                          <li key={i} style={{ marginBottom: 6 }}>
                            <div style={{ fontWeight: 600 }}>{r.name ?? "Unnamed"}</div>
                            <div style={{ fontSize: 12, color: "#555" }}>
                              {r.rating ? `${r.rating}★` : ""}
                              {r.price ? ` • ${r.price}` : ""}
                              {r.distance_m ? ` • ${Math.round(r.distance_m)} m` : ""}
                              {/* {r.cuisines ? ` • ${Array.isArray(r.cuisines) ? r.cuisines.join(", ") : r.cuisines}` : ""} */}
                              {r.cuisines && Array.isArray(r.cuisines)
                                ? ` • ${r.cuisines.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")}`
                                : r.cuisines ? ` • ${r.cuisines}` : ""}
                            </div>
                            {r.url ? (
                              <div style={{ marginTop: 4 }}>
                                <a href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                                  View on Yelp
                                </a>
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ fontSize: 13, color: "#666" }}>No restaurants found for this hotel.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="sidebar-container">
      <h1 style={{ fontSize: "48px", fontFamily: "Playfair Display, serif" }}>Your Results</h1>

      {/* LLM section: button to fetch and display /llm/ data */}
      <div style={{ marginBottom: 12 }}>
        <button className="llm-btn btn-outline" onClick={fetchLLM} disabled={llmLoading}>
          {llmLoading ? "Loading…" : "Read LLM recommendations"}
        </button>
        {llmError && <div style={{ color: "crimson", marginTop: 8 }}>Error: {llmError}</div>}
        {llmData && (
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: 8 }}>
            {typeof llmData === "string" ? llmData : JSON.stringify(llmData, null, 2)}
          </pre>
        )}
      </div>

      {/* New: clean recommendations UI */}
      {renderRecommendations()}

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