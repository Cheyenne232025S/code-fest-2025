import React from "react";
import { Link } from "react-router-dom";
import "./questionaireHeader.css";

function QuestionaireHeader() {
  return (
    <div className="questionaireHeader-container">
      <img src="Mariott2.png" alt="Logo" className="questionaireHeader-logo" />
      <h1 className="questionaireHeader-title">Restaurant Survey</h1>
      {/* added info icon linking to /about */}
      <Link to="/about" className="info-icon" aria-label="About">
        i
      </Link>
    </div>
  );
}

export default QuestionaireHeader;