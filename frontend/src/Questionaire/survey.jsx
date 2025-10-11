import React, { useState, useEffect } from "react";
import "./survey.css";

function Survey() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [savedResponses, setSavedResponses] = useState([]);

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

  return (
    <div className="survey-container">
      <h1>Survey</h1>

      {step === 0 ? (
        <>
          <h2>Instructions</h2>
          <p>
            Please answer the following questions about your travel habits and
            experiences. Click “Next” to begin.
          </p>
          <button className="next-button" onClick={handleNext}>
            Start
          </button>
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
          </div>
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

          <div style={{ marginTop: 12 }}>
            <button onClick={saveCurrentResponse}>Save response</button>
            <button
              onClick={async () => {
                try {
                  await sendToBackend({ id: Date.now(), timestamp: new Date().toISOString(), answers });
                } catch (e) {
                  // handle error
                }
              }}
              style={{ marginLeft: 8 }}
            >
              Send response now
            </button>
            <button onClick={sendSavedResponses} style={{ marginLeft: 8 }}>
              Send all saved
            </button>
            <button onClick={clearSavedResponses} style={{ marginLeft: 8 }}>
              Clear saved
            </button>
          </div>

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
