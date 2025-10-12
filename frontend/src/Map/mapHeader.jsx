import React from "react";
import { Link } from "react-router-dom";
import "./mapHeader.css";

function MapHeader() {
  return (
    <div className="mapHeader-container">
      <img src="Mariott2.png" alt="Logo" className="mapHeader-logo" />
      <h1 className="mapHeader-title">View Hotel Locations</h1>
      {/* added info icon linking to /about */}
      <Link to="/about" className="info-icon" aria-label="About">
        i
      </Link>
    </div>
  );
}



export default MapHeader;
export { MapHeader };