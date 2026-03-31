import React from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { NAV_ITEMS } from "../constants/data";
import { useAuth } from "../context/AuthContext";

// Mapeo de IDs a rutas URL
const NAV_ROUTES = {
  home: "/",
  solver: "/solver",
  comparar: "/comparar",
  metodos: "/metodos",
  amn: "/aplicaciones",
  docs: "/docs",
};

export const Navigation = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="nav">
      <Link to="/" className="nav-logo">
        Numérika<span>AI</span>
      </Link>

      <ul className="nav-links">
        {NAV_ITEMS.map(([id, label]) => (
          <li key={id}>
            <NavLink
              to={NAV_ROUTES[id] || "/"}
              className={({ isActive }) => (isActive ? "active" : "")}
              end={id === "home"}
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="nav-auth">
        {isAuthenticated ? (
          <>
            <span className="nav-user-greeting">
              Hola, {user.name}
            </span>
            <button className="btn-login" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <Link to="/register" className="btn-register">Register</Link>
            <Link to="/login" className="btn-login">Login</Link>
          </>
        )}
      </div>
    </nav>
  );
};
