import React, { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { NAV_ITEMS } from "../constants/data";
import { useAuth } from "../context/AuthContext";

// Mapeo de IDs a rutas URL
const NAV_ROUTES = {
  home: "/",
  solver: "/solver",
  comparar: "/comparar",
  metodos: "/metodos",
  amn: "/aplicaciones",
  calculadora: "/calculadora",
  docs: "/docs",
};

// Iconos temáticos para el drawer mobile
const NAV_ICONS = {
  home: "⌂",
  solver: "●",
  comparar: "●",
  metodos: "●",
  amn: "●",
  calculadora: "●",
  docs: "●",
};

// Links que se agrupan bajo "Herramientas" en tablet
const TOOLS_GROUP = ["metodos", "amn", "calculadora"];

export const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const navRef = useRef(null);
  const pillRef = useRef(null);
  const linksRef = useRef(null);
  const toolsDropRef = useRef(null);

  // ── Scroll listener ───────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Close drawer on route change ──────────────────────────────────────
  useEffect(() => {
    setDrawerOpen(false);
    setToolsOpen(false);
  }, [location.pathname]);

  // ── Close tools dropdown on outside click ─────────────────────────────
  useEffect(() => {
    if (!toolsOpen) return;
    const handler = (e) => {
      if (toolsDropRef.current && !toolsDropRef.current.contains(e.target)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [toolsOpen]);

  // ── Pill indicator position ───────────────────────────────────────────
  const updatePill = useCallback(() => {
    if (!linksRef.current || !pillRef.current) return;
    const activeLink = linksRef.current.querySelector("a.active");
    if (activeLink) {
      const linkRect = activeLink.getBoundingClientRect();
      const containerRect = linksRef.current.getBoundingClientRect();
      pillRef.current.style.width = `${linkRect.width + 16}px`;
      pillRef.current.style.transform = `translateX(${linkRect.left - containerRect.left - 8}px)`;
      pillRef.current.style.opacity = "1";
    } else {
      pillRef.current.style.opacity = "0";
    }
  }, []);

  useEffect(() => {
    // Small delay to let DOM settle after route change
    const timer = setTimeout(updatePill, 50);
    window.addEventListener("resize", updatePill);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePill);
    };
  }, [location.pathname, updatePill]);

  // ── Lock body scroll when drawer is open ──────────────────────────────
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Separate main links from tools-group links
  const mainLinks = NAV_ITEMS.filter(([id]) => !TOOLS_GROUP.includes(id));
  const toolsLinks = NAV_ITEMS.filter(([id]) => TOOLS_GROUP.includes(id));

  // Check if current route is within tools group
  const isToolsActive = TOOLS_GROUP.some(
    (id) => location.pathname.startsWith(NAV_ROUTES[id])
  );

  return (
    <>
      <nav
        ref={navRef}
        className={`nav ${scrolled ? "nav--scrolled" : ""}`}
        id="main-nav"
      >
        {/* ── Logo ── */}
        <Link to="/" className="nav-logo">
          Numérika<span>AI</span>
        </Link>

        {/* ── Desktop Links ── */}
        <div className="nav-links-wrap" ref={linksRef}>
          {/* Pill indicator */}
          <div className="nav-pill" ref={pillRef} />

          <ul className="nav-links">
            {mainLinks.map(([id, label]) => (
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

            {/* Tools dropdown (tablet) */}
            {toolsLinks.length > 0 && (
              <li
                className="nav-tools-wrapper"
                ref={toolsDropRef}
              >
                <button
                  className={`nav-tools-trigger ${isToolsActive ? "active" : ""}`}
                  onClick={() => setToolsOpen(!toolsOpen)}
                  aria-expanded={toolsOpen}
                  id="tools-dropdown-trigger"
                >
                  Herramientas
                  <span className={`nav-tools-arrow ${toolsOpen ? "open" : ""}`}>▾</span>
                </button>

                {toolsOpen && (
                  <div className="nav-tools-dropdown" id="tools-dropdown">
                    {toolsLinks.map(([id, label]) => (
                      <NavLink
                        key={id}
                        to={NAV_ROUTES[id] || "/"}
                        className={({ isActive }) =>
                          `nav-tools-item ${isActive ? "active" : ""}`
                        }
                      >
                        <span className="nav-tools-icon">{NAV_ICONS[id]}</span>
                        {label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </li>
            )}

            {/* Full links (shown on wider screens, hidden on tablet) */}
            {toolsLinks.map(([id, label]) => (
              <li key={id} className="nav-full-link">
                <NavLink
                  to={NAV_ROUTES[id] || "/"}
                  className={({ isActive }) => (isActive ? "active" : "")}
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Auth section ── */}
        <div className="nav-auth">
          {isAuthenticated ? (
            <>
              <button
                className="nav-avatar"
                title={`${user.name} — Click para cerrar sesión`}
                onClick={handleLogout}
                id="nav-user-avatar"
              >
                {user.name?.charAt(0).toUpperCase() || "U"}
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-ingresar" id="nav-ingresar-btn">
              Ingresar
            </Link>
          )}
        </div>

        {/* ── Hamburger button (mobile) ── */}
        <button
          className={`nav-hamburger ${drawerOpen ? "open" : ""}`}
          onClick={() => setDrawerOpen(!drawerOpen)}
          aria-label="Menú de navegación"
          aria-expanded={drawerOpen}
          id="nav-hamburger"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </nav>

      {/* ── Mobile Drawer Overlay ── */}
      <div
        className={`nav-overlay ${drawerOpen ? "open" : ""}`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* ── Mobile Drawer ── */}
      <aside
        className={`nav-drawer ${drawerOpen ? "open" : ""}`}
        id="nav-drawer"
      >
        <div className="drawer-header">
          <span className="drawer-title">Navegación</span>
          <button
            className="drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <div className="drawer-links">
          {NAV_ITEMS.map(([id, label]) => (
            <NavLink
              key={id}
              to={NAV_ROUTES[id] || "/"}
              className={({ isActive }) =>
                `drawer-link ${isActive ? "active" : ""}`
              }
              end={id === "home"}
              onClick={() => setDrawerOpen(false)}
            >
              <span className="drawer-icon">{NAV_ICONS[id] || "·"}</span>
              <span className="drawer-label">{label}</span>
            </NavLink>
          ))}
        </div>

        <div className="drawer-divider" />

        <div className="drawer-auth">
          {isAuthenticated ? (
            <>
              <div className="drawer-user">
                <div className="drawer-user-avatar">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <span className="drawer-user-name">Hola, {user.name}</span>
              </div>
              <button className="drawer-logout" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <div className="drawer-auth-buttons">
              <Link
                to="/register"
                className="drawer-btn drawer-btn--register"
                onClick={() => setDrawerOpen(false)}
              >
                Crear cuenta
              </Link>
              <Link
                to="/login"
                className="drawer-btn drawer-btn--login"
                onClick={() => setDrawerOpen(false)}
              >
                Iniciar sesión
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
