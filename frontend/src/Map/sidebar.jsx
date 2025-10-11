import React from "react";
import "./sidebar.css";

function Sidebar() {
  return (
    <div className="sidebar-container">
      <h1>Sidebar</h1>
      {/* short decorative divider (65px line + content) */}
      <div
        className="divider"
        tabIndex="0"
        role="separator"
        aria-orientation="horizontal"
      >
        <span className="divider-line" aria-hidden="true" />
        <div className="divider-content">Section content or controls go here.</div>
      </div>

      

      {/* another divider example */}
      <div
        className="divider"
        tabIndex="0"
        role="separator"
        aria-orientation="horizontal"
      >
        <span className="divider-line" aria-hidden="true" />
        <div className="divider-content">
          <p>Additional section content.</p>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;