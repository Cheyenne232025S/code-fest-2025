import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./survey.css";

function Survey() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [savedResponses, setSavedResponses] = useState([]);

  // add submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // null | 'success' | 'error'

  // per-question submit state
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [questionSubmitStatus, setQuestionSubmitStatus] = useState(null); // null | 'success' | 'error'

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
      options: [">1 Mile", "2–3 Miles", "More than 3 Miles"],
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
  }, []);

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

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const saveCurrentResponse = () => {
    const payload = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      answers,
    };
    const existing = JSON.parse(localStorage.getItem("surveyResponses") || "[]");
    const updated = [payload, ...existing];
    localStorage.setItem("surveyResponses", JSON.stringify(updated));
    setSavedResponses(updated);
  };

  const clearSavedResponses = () => {
    localStorage.removeItem("surveyResponses");
    setSavedResponses([]);
  };






  //PSUEUDO BACKEND PUT IN LATER
  const BACKEND_ENDPOINT = "http://localhost:4000/api/responses";

  const sendToBackend = async (payload) => {
    try {
      const res = await fetch(BACKEND_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Network response was not ok");
      return await res.json();
    } catch (err) {
      // offline/no backend: persist to outbox and resolve with offlineSaved
      console.warn("Backend unavailable — saving to outbox", err);
      const outbox = JSON.parse(localStorage.getItem("outbox") || "[]");
      const item = { id: Date.now(), timestamp: new Date().toISOString(), payload };
      outbox.push(item);
      localStorage.setItem("outbox", JSON.stringify(outbox));
      // schedule a flush attempt (flush runs periodically via effect below)
      return { offlineSaved: true, savedId: item.id };
    }
  };

  // try to send queued outbox items when online / periodically
  const flushOutbox = async () => {
    const outbox = JSON.parse(localStorage.getItem("outbox") || "[]");
    if (!outbox.length) return;
    if (!navigator.onLine) return;
    const remaining = [];
    for (const item of outbox) {
      try {
        const res = await fetch(BACKEND_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });
        if (!res.ok) throw new Error("Network response was not ok");
        // success: drop item
      } catch (e) {
        // keep item for retry
        remaining.push(item);
      }
    }
    localStorage.setItem("outbox", JSON.stringify(remaining));
  };

  // ensure flush runs periodically and when coming online
  useEffect(() => {
    const interval = setInterval(() => {
      flushOutbox();
    }, 30_000); // try every 30s

    const onOnline = () => flushOutbox();
    window.addEventListener("online", onOnline);

    // attempt immediate flush on mount (if online)
    flushOutbox();

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  // helper: send payload and navigate to /map on success (or offlineSaved)
  const sendAndNavigateIfOK = async (payload) => {
    const res = await sendToBackend(payload);
    // treat either a real response or an offlineSaved result as successful for navigation
    if (res && (res.offlineSaved || Object.keys(res).length >= 0)) {
      // small delay to allow UI update, then navigate
      navigate("/map");
    }
    return res;
  };

  // submit only the current question's answer immediately
  const submitCurrentQuestion = async () => {
    const q = questions[step - 1];
    if (!q) return;
    setQuestionSubmitting(true);
    setQuestionSubmitStatus(null);
    try {
      const payload = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        questionId: q.id,
        questionText: q.text,
        answer: answers[q.id] || [],
      };
      const res = await sendToBackend(payload);
      setQuestionSubmitStatus("success");
      // navigate on success / offline save
      if (res && (res.offlineSaved || Object.keys(res).length >= 0)) {
        navigate("/map");
      }
    } catch (err) {
      setQuestionSubmitStatus("error");
    } finally {
      setQuestionSubmitting(false);
    }
  };

  // new handlers for final-screen actions
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitStatus(null);
    try {
      await sendToBackend({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        answers,
      });
      setSubmitStatus("success");
      // optionally persist locally as well:
      saveCurrentResponse();
      // navigate to the map page after successful submit
      navigate("/map");
    } catch (err) {
      setSubmitStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackFromSummary = () => {
    setStep(questions.length); // go back to last question
  };

  const handleRestart = () => {
    setStep(0);
    setAnswers({});
    setSubmitStatus(null);
  };

  // send all saved responses and navigate when sent/saved
  const sendSavedResponses = async () => {
    if (savedResponses.length === 0) return;
    try {
      const res = await sendToBackend({ responses: savedResponses });
      // navigate on network success or offline save
      if (res && (res.offlineSaved || Object.keys(res).length >= 0)) {
        navigate("/map");
      }
      // optionally clear after successful send:
      // clearSavedResponses();
    } catch (err) {
      // handle/send error to user
    }
  };

  // send current entire response and navigate
  const sendNowAndNavigate = async () => {
    try {
      const res = await sendToBackend({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        answers,
      });
      if (res && (res.offlineSaved || Object.keys(res).length >= 0)) {
        navigate("/map");
      }
    } catch (e) {
      // handle error
    }
  };

  // skip the survey: send a minimal payload and navigate to /map
  const handleSkip = async () => {
    const payload = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      skipped: true,
      answers, // include whatever has been filled so far (may be empty)
    };
    try {
      // attempt send; sendToBackend will save to outbox if backend missing
      const res = await sendToBackend(payload);
      // navigate if send returned (network success or offlineSaved)
      if (res && (res.offlineSaved || Object.keys(res).length >= 0)) {
        navigate("/map");
        return;
      }
    } catch (e) {
      // ignore errors — still navigate
    }
    // fallback navigation
    navigate("/map");
  };

  return (
    <div className="survey-container">
      <h1 className="survey-title">Survey</h1>

      {step === 0 ? (
        <>
          <h2>Instructions</h2>
          <p>
            Please answer the following questions about your travel habits and
            experiences. Click “Next” to begin.
          </p>
          <div className="button-row">
            <button className="next-button" onClick={handleNext}>
              Start
            </button>
            <button className="skip-button" onClick={handleSkip}>
              Skip
            </button>
          </div>
        </>
      ) : step <= questions.length ? (
        <>
          <h2>
            Question {step} of {questions.length}
          </h2>
          <p>{questions[step - 1].text}</p>

          {/* Render based on question type */}
          <div className="options">
            {questions[step - 1].type === "single" &&
              questions[step - 1].options.map((option, index) => (
                <label key={index} className="option-item">
                  <input
                    type="radio"
                    name={`q${questions[step - 1].id}`}
                    value={option}
                    checked={
                      answers[questions[step - 1].id]?.includes(option) || false
                    }
                    onChange={() =>
                      handleChange(
                        questions[step - 1].id,
                        option,
                        false // not multiple
                      )
                    }
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
                    checked={
                      answers[questions[step - 1].id]?.includes(option) || false
                    }
                    onChange={() =>
                      handleChange(
                        questions[step - 1].id,
                        option,
                        true // multiple
                      )
                    }
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
                onChange={(e) =>
                  handleTextChange(questions[step - 1].id, e.target.value)
                }
              />
            )}
          </div>

          <div className="button-row">
             {step > 0 && (
               <button className="back-button" onClick={handleBack}>
                 Back
               </button>
             )}
             <button className="next-button" onClick={handleNext}>
               {step === questions.length ? "Finish" : "Next"}
             </button>

             {/* immediate submit for the current question */}
             <button
               className="submit-question-button"
               onClick={submitCurrentQuestion}
               disabled={questionSubmitting}
             >
               {questionSubmitting ? "Submitting..." : "Submit answer now"}
             </button>
           </div>

          {/* per-question submit status */}
          {questionSubmitStatus === "success" && (
            <div style={{ color: "green", marginTop: 8 }}>
              Question submitted successfully.
            </div>
          )}
          {questionSubmitStatus === "error" && (
            <div style={{ color: "red", marginTop: 8 }}>
              Question submission failed.
            </div>
          )}
        </>
      ) : (
        <>
          <h2>Thank you!</h2>
          <p>Your responses:</p>
          <ul className="answers-list">
            {questions.map((q) => (
              <li key={q.id}>
                <strong>{q.text}</strong>
                <br />
                {answers[q.id]?.join(", ") || "No answer"}
              </li>
            ))}
          </ul>

          <div className="final-actions">
            <button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit response"}
            </button>

            <button onClick={handleBackFromSummary}>
              Back to last question
            </button>

            <button onClick={handleRestart}>
              Restart survey
            </button>

            {/* keep existing utilities (save/send/clear) */}
            <button onClick={saveCurrentResponse}>
              Save response
            </button>
            <button onClick={sendNowAndNavigate}>
              Send response now
            </button>
            <button onClick={sendSavedResponses}>
              Send all saved
            </button>
            <button onClick={clearSavedResponses}>
              Clear saved
            </button>
          </div>

          {submitStatus === "success" && (
            <div style={{ color: "green", marginTop: 8 }}>
              Submitted successfully.
            </div>
          )}
          {submitStatus === "error" && (
            <div style={{ color: "red", marginTop: 8 }}>
              Submission failed. Try again.
            </div>
          )}

          <h3 style={{ marginTop: 18 }}>Saved responses</h3>
          <ul>
            {savedResponses.length === 0 && <li>No saved responses</li>}
            {savedResponses.map((r) => (
              <li key={r.id}>
                {new Date(r.timestamp).toLocaleString()} — {Object.values(r.answers).flat().join(", ")}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default Survey;
