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
      text: "What’s reason of your travel?",
      type: "single",
      options: ["Business", "Solo", "Family", "Friends"],
    },
  ];

  // Load saved responses from localStorage on mount
  useEffect(() => {
    const existing = JSON.parse(localStorage.getItem("surveyResponses") || "[]");
    setSavedResponses(existing);
    // If there is any saved response, consider the "first" already saved.
    const persistedFlag = localStorage.getItem("surveyFirstSaved");
    if (persistedFlag === "true" || existing.length > 0) {
      setFirstSaved(true);
      localStorage.setItem("surveyFirstSaved", "true");
    }
  }, []);

  // Auto-save the FIRST completion when the user reaches the summary
  useEffect(() => {
    // summary is shown when step is questions.length + 1
    if (step === questions.length + 1) {
      // if first already saved, do nothing
      if (localStorage.getItem("surveyFirstSaved") === "true") return;

      const payload = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        answers,
      };
      const existing = JSON.parse(localStorage.getItem("surveyResponses") || "[]");
      const updated = [payload, ...existing];
      localStorage.setItem("surveyResponses", JSON.stringify(updated));
      localStorage.setItem("surveyFirstSaved", "true");
      setSavedResponses(updated);
      setFirstSaved(true);
    }
  }, [step]); // run when step changes

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

  // restart survey: clear answers and return to intro
  const restartSurvey = () => {
    setAnswers({});
    setStep(0);
  };

  const saveCurrentResponse = () => {
    // only allow saving if first hasn't been saved yet
    if (localStorage.getItem("surveyFirstSaved") === "true") {
      // already saved the first response — do not save additional ones
      return;
    }
    const payload = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      answers,
    };
    const existing = JSON.parse(localStorage.getItem("surveyResponses") || "[]");
    const updated = [payload, ...existing];
    localStorage.setItem("surveyResponses", JSON.stringify(updated));
    localStorage.setItem("surveyFirstSaved", "true");
    setSavedResponses(updated);
    setFirstSaved(true);
  };

  const clearSavedResponses = () => {
    localStorage.removeItem("surveyResponses");
    setSavedResponses([]);
  };


  //PSUEDO CODE FOR SENDING TO BACKEND
  const sendToBackend = async (payload) => {
    try {
      // replace with your real backend endpoint
      const res = await fetch("http://localhost:4000/api/responses", {
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
    try {
      await sendToBackend({ id: Date.now(), timestamp: new Date().toISOString(), answers });
    } catch (e) {
      // ignore send errors for now
    } finally {
      // navigate to /map (works without depending on react-router version)
      window.location.href = "/map";
    }
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
              {!firstSaved && (
                <button className="btn btn-outline" onClick={saveCurrentResponse}>
                  Save response
                </button>
              )}
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
