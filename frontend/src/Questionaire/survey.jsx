import React, { useState, useEffect } from "react";
import "./survey.css";

function Survey() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [savedResponses, setSavedResponses] = useState([]);
  // track whether the first response was already saved (persisted)
  const [firstSaved, setFirstSaved] = useState(false);

  // Define questions — supports "single", "multiple", and "text"
  const questions = [
    {
      id: 1,
      text: "Which city would you like to visit?",
      type: "text",
    },
    {
      id: 2,
      text: "What distance are you willing to travel for food?",
      type: "multiple",
      options: ["<1 Mile", "2–3 Miles", "More than 3 Miles"],
    },
    {
      id: 3,
      text: "What’s your reason for travel?",
      type: "single",
      options: ["Business", "Solo", "Family", "Friends"],
    },
    {
      id: 4,
      text: "Cuisine Preference?",
      type: "multiple",
      options: ["Italian", "Chinese", "Mexican", "Greek", "Halal", "French", "Thai", "Korean"],
    },
    {
      id: 5, 
      text: "Yelp Rating?",
      type: "single",
      options: ["1 Star", "2 Stars", "3 Stars", "4 Stars", "5 Stars"],
    }, 
    {
      id: 6,
      text: "Price Range:",
      type: "single",
      options: ["$20/person", "$40/person", "$80/person", "Ritzy"],
    }
  ];

  // Load saved responses from localStorage on mount
  useEffect(() => {
    let existing = JSON.parse(localStorage.getItem("surveyResponses") || "[]");
    // enforce max 1 saved response (keep most recent if array is present)
    if (existing.length > 1) {
      existing = [existing[0]];
      try {
        localStorage.setItem("surveyResponses", JSON.stringify(existing));
      } catch (err) {
        // ignore storage errors
      }
    }
    setSavedResponses(existing);
    // reflect whether there are saved responses (UI only)
    setFirstSaved(existing.length > 0);

    // restore draft (per-question autosave) if present
    try {
      const draft = JSON.parse(localStorage.getItem("surveyDraft") || "null");
      if (draft && draft.answers) {
        setAnswers(draft.answers);
        // always start at the beginning page on reload
        setStep(0);
      }
    } catch (err) {
      // ignore parse errors
    }
  }, []);

  // Auto-save the FIRST completion when the user reaches the summary
  useEffect(() => {
    // summary is shown when step is questions.length + 1
    if (step === questions.length + 1) {
      // Replace stored responses with a single (most recent) payload
      const payload = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        answers,
      };
      const updated = [payload]; // only keep this one
      try {
        localStorage.setItem("surveyResponses", JSON.stringify(updated));
      } catch (err) {
        // ignore storage errors
      }
      setSavedResponses(updated);
      setFirstSaved(true);
      localStorage.removeItem("surveyDraft");
    }
  }, [step]); // run when step changes

  // Auto-save draft after each question change (answers or step)
  useEffect(() => {
    // only save drafts once the user has started (step > 0)
    if (step <= 0) return;
    // don't save an empty answers object
    if (!answers || Object.keys(answers).length === 0) {
      localStorage.removeItem("surveyDraft");
      return;
    }

    const normalizedAnswers = Object.fromEntries(
      Object.entries(answers).map(([k, v]) => [String(k), v])
    );
    const draft = {
      timestamp: new Date().toISOString(),
      step,
      answers: normalizedAnswers,
    };
    try {
      localStorage.setItem("surveyDraft", JSON.stringify(draft));
    } catch (err) {
      // ignore quota/storage issues
    }
  }, [answers, step, questions.length]);
 
  // Handle input changes for different question types
  const handleChange = (questionId, value, isMultiple) => {
    setAnswers((prev) => {
      if (isMultiple) {
        const prevAnswers = prev[questionId] || [];
        const updatedAnswers = prevAnswers.includes(value)
          ? prevAnswers.filter((o) => o !== value)
          : [...prevAnswers, value];
        return { ...prev, [questionId]: updatedAnswers };
      } else if (Array.isArray(value)) {
        return { ...prev, [questionId]: value };
      } else {
        return { ...prev, [questionId]: [value] };
      }
    });
  };

  const handleTextChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: [value] }));
  };

  // Handle navigation
  const handleNext = () => {
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  // go back one step (safe for summary and question views)
  const goToPrevious = () => {
    setStep((prev) => Math.max(0, prev - 1));
  };

  const restartSurvey = () => {
    setAnswers({});
    setStep(0);
    // clear any draft when restarting
    localStorage.removeItem("surveyDraft");
  };

  const saveCurrentResponse = () => {
    // Always allow explicit manual save. Replace stored responses with this one (max=1).
    const normalizedAnswers = Object.fromEntries(
      Object.entries(answers).map(([k, v]) => [String(k), v])
    );
    const payload = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      answers: normalizedAnswers,
    };
    const updated = [payload]; // enforce single saved response
    try {
      localStorage.setItem("surveyResponses", JSON.stringify(updated));
    } catch (err) {
      // ignore storage errors
    }
    setSavedResponses(updated);
    setFirstSaved(true);
    // clear draft after manual full save
    localStorage.removeItem("surveyDraft");
  };

  const clearSavedResponses = () => {
    localStorage.removeItem("surveyResponses");
    setSavedResponses([]);
  };

  const sendToBackend = async (payload) => {
    try {
      // FastAPI endpoint (adjust port if your backend runs elsewhere)
      const res = await fetch("http://localhost:8000/submit/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Network response was not ok");
      return await res.json();
    } catch (err) {
      console.error("Send failed", err);
      throw err;
    }
  };

  const sendSavedResponses = async () => {
    if (savedResponses.length === 0) return;
    try {
      // send all saved responses in one request; adjust as needed
      await sendToBackend({ responses: savedResponses });
      // optionally clear after successful send:
      // clearSavedResponses();
    } catch (err) {
      // handle/send error to user
    }
  };


  // Helper: return true only if every question has an answer (text must be non-empty)
  const allAnswered = () => {
    return questions.every((q) => {
      const ans = answers[q.id];
      if (!ans || ans.length === 0) return false;
      if (q.type === "text") return (ans[0] || "").toString().trim().length > 0;
      return true;
    });
  };

  // submit handler: ensure all answered, send, then navigate to /map
  const handleSubmit = async () => {
    if (!allAnswered()) {
      alert("Please answer all questions before submitting.");
      return;
    }

    // Normalize answers keys to strings to match backend typing
    const normalizedAnswers = Object.fromEntries(
      Object.entries(answers).map(([k, v]) => [String(k), v])
    );

    const payload = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      answers: normalizedAnswers,
    };

    try {
      const backendResponse = await sendToBackend(payload);
      // store backend response so /map can read it (sessionStorage cleared on tab close)
      try {
        sessionStorage.setItem("surveySubmission", JSON.stringify(backendResponse));
      } catch (err) {
        // ignore storage errors
      }
    } catch (e) {
      // optionally show an error to the user; proceed to map regardless
      console.error("Submit failed", e);
    } finally {
      // navigate to /map where the page can read sessionStorage['surveySubmission']
      window.location.href = "/map";
    }
  };

  // Load the single saved response (if any) and show the summary
  const handleLoadSaved = () => {
    // prefer in-memory state, fallback to localStorage
    const existing = savedResponses.length
      ? savedResponses
      : JSON.parse(localStorage.getItem("surveyResponses") || "[]");
    if (!existing || existing.length === 0) {
      alert("No saved response found.");
      return;
    }
    const saved = existing[0];
    // set answers and jump to the summary view
    setAnswers(saved.answers || {});
    setStep(questions.length + 1);
  };

  return (
    <div className="survey-container">
      <div className="survey-card">
        <h1 className="survey-title">Travel Survey</h1>

        {step === 0 ? (
          <div className="survey-intro">
            <h2 style={{ color: "#B41F3A" }}>Welcome!</h2>
            <p style={{ color: "#B41F3A" }}>
              Help us personalize your travel experience. This quick survey takes less than a minute.
            </p>
            <div style={{ marginBottom: 12 }}>
              <button className="btn btn-outline" onClick={handleLoadSaved}>
                I've already filled this survey
              </button>
            </div>
            <button className="btn btn-primary" onClick={handleNext}>
              Start Survey
            </button>
          </div>
        ) : step <= questions.length ? (
          <div className="survey-question">
            <h2 style={{ color: "#B41F3A" }}>
              Question {step} of {questions.length}
            </h2>
            <p className="question-text">{questions[step - 1].text}</p>

            <div className="options">
              {questions[step - 1].type === "single" &&
                questions[step - 1].options.map((option, index) => (
                  <label key={index} className="option-item">
                    <input
                      type="radio"
                      name={`q${questions[step - 1].id}`}
                      value={option}
                      checked={answers[questions[step - 1].id]?.includes(option) || false}
                      onChange={() => handleChange(questions[step - 1].id, option, false)}
                    />
                    {option}
                  </label>
                ))}

              {questions[step - 1].type === "multiple" &&
                questions[step - 1].options.map((option, index) => (
                  <label key={index} className="option-item">
                    <input
                      type="checkbox"
                      name={`q${questions[step - 1].id}`}
                      value={option}
                      checked={answers[questions[step - 1].id]?.includes(option) || false}
                      onChange={() => handleChange(questions[step - 1].id, option, true)}
                    />
                    {option}
                  </label>
                ))}

              {questions[step - 1].type === "text" && (
                <textarea
                  className="survey-textarea"
                  rows="4"
                  placeholder="Type your answer here..."
                  value={answers[questions[step - 1].id]?.[0] || ""}
                  onChange={(e) => handleTextChange(questions[step - 1].id, e.target.value)}
                />
              )}
            </div>

            <div className="button-row">
              {step > 0 && (
                <button className="btn btn-secondary" onClick={handleBack}>
                  Back
                </button>
              )}
              <button className="btn btn-primary" onClick={handleNext}>
                {step === questions.length ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        ) : (
          <div className="survey-summary">
            <h2>Thank you!</h2>
            <p style={{ color: "#B41F3A" }}>Here’s a summary of your responses:</p>
            <ul className="answers-list">
              {questions.map((q) => (
                <li key={q.id}>
                  <strong>{q.text}</strong>
                  <br />
                  {answers[q.id]?.join(", ") || "No answer"}
                </li>
              ))}
            </ul>

            <div className="button-row">
              {/* go back to the previous question from the summary */}
              <button className="btn btn-secondary" onClick={goToPrevious}>
                Previous question
              </button>
              {/* allow explicit saving even if previous saves exist */}
              <button className="btn btn-outline" onClick={saveCurrentResponse}>
                Save response
              </button>
              {/* allow restarting from the summary (styled like the old Clear saved button) */}
              <button className="btn btn-danger" onClick={restartSurvey}>
                Restart survey
              </button>
              <button
                className="btn"
                style={{ backgroundColor: "#28a745", color: "white" }}
                onClick={handleSubmit}
              >
                Submit survey
              </button>
            </div>

            <h3>📦 Saved responses</h3>
            <ul className="saved-list">
              {savedResponses.length === 0 && <li>No saved responses</li>}
              {savedResponses.map((r) => (
                <li key={r.id}>
                  {new Date(r.timestamp).toLocaleString()} — {Object.values(r.answers).flat().join(", ")}
                </li>
              ))}
            </ul>
          </div>
        )}
        
      </div>
    </div>
  );
}

export default Survey;
