import React from "react";
import { NAV_ITEMS } from "../constants/data";

export const Navigation = ({ currentPage, onPageChange }) => {
  return (
    <nav className="nav">
      <div className="nav-logo" onClick={() => onPageChange("home")}>
        Numérika<span>AI</span>
      </div>
      <ul className="nav-links">
        {NAV_ITEMS.map(([id, label]) => (
          <li
            key={id}
            className={currentPage === id ? "active" : ""}
            onClick={() => onPageChange(id)}
          >
            {label}
          </li>
        ))}
      </ul>
      <nav>
        <p>
          <a href="https://github.com/lautioliver/numerika-ai" target="_blank" rel="noopener noreferrer" style={{color: "#040404", textAlign: "center", display: "inline-flex", alignItems: "center", gap: "6px"}}>
            <img src="/GitHub_Invertocat_White_Clearspace.png" alt="GitHub" style={{ width: "35px", verticalAlign: "middle" , color: "#0b0e0d"}} />
          </a>
        </p>
      </nav> 
    </nav>
  );
};
