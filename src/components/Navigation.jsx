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
        {/* BOTÓN DE REGISTRO MANUALMENTE */}
        <nav>
          <ul>
          <div className="nav-links">
            <button className="btn-register" onClick={() => onPageChange("register")}>Register</button>
            <button className="btn-login" onClick={() => onPageChange("login")}>Login</button>
          </div>
          </ul>
        </nav>  
    </nav>
  );
};
