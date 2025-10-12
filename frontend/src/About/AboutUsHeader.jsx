import { Link } from "react-router-dom";
import "./AboutUsHeader.css";

export default function AboutUsHeader() {
  return (
    <div className="about-header-bar">
      <Link to="/" className="about-back-btn">
        Back to Survey
      </Link>
      <h1 className="about-title">About Us</h1>
    </div>
  );
}
