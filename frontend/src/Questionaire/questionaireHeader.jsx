import React from "react";
import "./questionaireHeader.css";

function QuestionaireHeader() {
  return (
    <div className="questionaireHeader-container">
      <img src="Mariott2.png" alt="Logo" className="questionaireHeader-logo" />
      <h1 className="questionaireHeader-title">Restaurant Survey</h1>
    </div>
  );
}

export default QuestionaireHeader;