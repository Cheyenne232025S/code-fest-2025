import React, { useState } from "react";
import "./survey.css";

function Survey() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

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
      type: "slider",
      // options: ["<1 Mile", "2–3 Miles", "More than 3 Miles"],
    },
    // {
    //   id: 3,
    //   text: "What’s your reason for travel?",
    //   type: "single",
    //   options: ["Business", "Solo", "Family", "Friends"],
    // },
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
      options: ["$", "$$", "$$$", "$$$$"],
    }
  ];

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
    } catch (e) {
      console.error("Submit failed", e);
    } finally {
      window.location.href = "/map";
    }
  };

  const [weights, setWeights] = useState({
    distance: 0.35,
    rating: 0.35,
    price: 0.15,
    cuisine: 0.15,
  });

  const handleWeightChange = (key, value) => {
    const floatVal = parseFloat(value);
    if (isNaN(floatVal)) return;

    const updated = { ...weights, [key]: floatVal };
    const total = Object.values(updated).reduce((sum, val) => sum + val, 0);

    if (total <= 1.0) {
      setWeights(updated);
    } else {
      alert("Total weight cannot exceed 1.0");
    }
  };

  return (
    <div className="survey-container">
      <div className="survey-card">
        <h1 className="survey-title">Travel Survey</h1>
          <div className="survey-intro">
                <h2 style={{ color: "#B41F3A" }}>Welcome!</h2>
                <p style={{ color: "#B41F3A" }}>
                  Help us personalize your travel experience. This quick survey takes less than a minute.
                </p>
              </div>

              <div className="survey-question">
                <h2 style={{ color: "#B41F3A" }}>Answer the questions below:</h2>
                {questions.map((q) => (
                  <div key={q.id} className="question-block">
                    <p className="question-text">{q.text}</p>
                    <div className="options">
                      {q.type === "single" &&
                        q.options.map((option, index) => (
                          <label key={index} className="option-item">
                            <input
                              type="radio"
                              name={`q${q.id}`}
                              value={option}
                              checked={answers[q.id]?.includes(option) || false}
                              onChange={() => handleChange(q.id, option, false)}
                            />
                            {option}
                          </label>
                        ))}

                      {q.type === "multiple" &&
                        q.options.map((option, index) => (
                          <label key={index} className="option-item">
                            <input
                              type="checkbox"
                              name={`q${q.id}`}
                              value={option}
                              checked={answers[q.id]?.includes(option) || false}
                              onChange={() => handleChange(q.id, option, true)}
                            />
                            {option}
                          </label>
                        ))}

                      {q.type === "text" && (
                        <textarea
                          className="survey-textarea"
                          rows="4"
                          placeholder="Type your answer here..."
                          value={answers[q.id]?.[0] || ""}
                          onChange={(e) => handleTextChange(q.id, e.target.value)}
                        />
                      )}

                      {q.type === "slider" && (
                        <div className="survey-slider">
                          <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.1"
                            value={answers[q.id]?.[0] || 0}
                            onChange={(e) => handleTextChange(q.id, parseFloat(e.target.value))}
                          />
                          <div style={{ color: "#B41F3A" }}>{answers[q.id]?.[0] || 0} miles</div>
                        </div>
                      )}


                      
                    </div>
                  </div>
                ))}
              </div>

              <div className="survey-weights">
                <h3>⚖️ Customize your preferences</h3>
                <p style={{ color: "#B41F3A" }}>
                  Adjust how much each factor matters. Total must not exceed 1.0.
                </p>
                <div className="weights-grid">
                  {Object.entries(weights).map(([key, val]) => (
                    <div key={key} className="weight-item">
                      <label>
                        {key.charAt(0).toUpperCase() + key.slice(1)}: {val.toFixed(2)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={val}
                        onChange={(e) => handleWeightChange(key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <p style={{ color: "#B41F3A" }}>
                  Total:{" "}
                  {Object.values(weights)
                    .reduce((sum, v) => sum + v, 0)
                    .toFixed(2)}
                </p>
              </div>

              <div className="button-row">
                <button
                  className="btn"
                  style={{ backgroundColor: "#28a745", color: "white" }}
                  onClick={handleSubmit}
                >
                  Submit Survey
                </button>
              </div>
            </div>
          </div>

  );
}



export default Survey;
