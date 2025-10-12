import React from "react";
import "./mapHeader.css";

function MapHeader() {
  return (
    <div className="mapHeader-container">
      <img src="Mariott2.png" alt="Logo" className="mapHeader-logo" />
      <h1 className="mapHeader-title">View Hotel Locations</h1>
    </div>
  );
}



export default MapHeader;
export { MapHeader };