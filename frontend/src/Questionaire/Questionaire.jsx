import React from "react";
import "./Questionaire.css";
import QuestionaireHeader from "./questionaireHeader";
import Survey from "./survey";

export default function Questionaire() {
  return (
    <>
      <QuestionaireHeader />
      <div className="questionaire-container">
        <Survey />
      </div>
    </>
  );
}