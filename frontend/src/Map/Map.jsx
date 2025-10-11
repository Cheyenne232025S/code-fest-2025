import React from "react";
import "./Map.css";
import MapHeader from "./mapHeader";
import Sidebar from "./sidebar";
import MapImage from "./mapImage";

export default function Map() {
  return (
    <div className="map-container">
      <MapHeader />
      <MapImage />
      <Sidebar />
      <h1>Map Site</h1>
    </div>
  );
}