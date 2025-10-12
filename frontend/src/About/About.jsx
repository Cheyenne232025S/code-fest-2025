import { Link } from "react-router-dom";
import "./About.css";
import AboutUsHeader from "./AboutUsHeader";

export default function About() {
  return (
    <div className="about-page">
      <AboutUsHeader />

      <section className="about-team">
        <h2> This project is done by a group of 5 Virginia Tech students for the 2025 Marroitt Code fest. We are Cheyenne Erickson CMDA major, Jaylene Chute CMDA major, Garrison Underwood Computer and Electrical engineering, and Alan Le Computer science Major. We made this project in the span of 48 hours. Thank you for checking it out! </h2>
        </section>
    </div>
  );
}
