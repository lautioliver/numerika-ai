import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  NUMERIKA_COLORSCALE,
  NUMERIKA_3D_LAYOUT,
  generateSurfaceData,
  generateSolutionCurve3D,
} from "../utils/edoPlot3D";

// ─── Plotly CDN loader (lazy) ────────────────────────────────────────────────
const PLOTLY_CDN = "https://cdn.plot.ly/plotly-2.35.2.min.js";

let plotlyPromise = null;

function loadPlotly() {
  if (window.Plotly) return Promise.resolve(window.Plotly);
  if (plotlyPromise) return plotlyPromise;

  plotlyPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PLOTLY_CDN;
    script.async = true;
    script.onload = () => resolve(window.Plotly);
    script.onerror = () => reject(new Error("No se pudo cargar Plotly.js"));
    document.head.appendChild(script);
  });

  return plotlyPromise;
}

// ─── Main component ─────────────────────────────────────────────────────────
/**
 * Plot3DModal — Modal de gráficos 3D interactivos.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - plotType: "surface" | "trajectory3d" | "trajectory2d_elevated"
 *  - title: string
 *  - badge: string
 *
 * Surface mode props:
 *  - rhsExpr: string (f(t,y))
 *  - points: [{t, y}] — curva solución
 *  - tRange: [tMin, tMax]
 *  - yRange: [yMin, yMax]
 *
 * Trajectory mode props:
 *  - trajectoryData: { x[], y[], z[] }
 *  - axisLabels: [xLabel, yLabel, zLabel]
 *  - availableVars: string[] — variables disponibles (para selector)
 *  - onVarsChange: (vars) => void
 */
export function Plot3DModal({
  open,
  onClose,
  plotType = "surface",
  title = "Gráfico 3D",
  subtitle,
  badge = "3D",
  // Surface props
  rhsExpr,
  points,
  tRange,
  yRange,
  // Trajectory props
  trajectoryData,
  axisLabels = ["x", "y", "z"],
  availableVars,
  onVarsChange,
}) {
  const chartRef = useRef(null);
  const plotlyRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Tool modes
  const [pointMode, setPointMode] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [pendingPoint, setPendingPoint] = useState(null);
  const [annotationLabel, setAnnotationLabel] = useState("");
  const annotationInputRef = useRef(null);

  // Layer toggles (surface mode)
  const [showSurface, setShowSurface] = useState(true);
  const [showCurve, setShowCurve] = useState(true);

  // Variable selector for systems with >3 vars
  const [selectedVars, setSelectedVars] = useState(axisLabels);

  // ─── Load Plotly ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setLoaded(false);
    setError(null);

    loadPlotly()
      .then((Plotly) => {
        plotlyRef.current = Plotly;
        setLoaded(true);
      })
      .catch((err) => setError(err.message));
  }, [open]);

  // ─── Build plot data ──────────────────────────────────────────────────
  const plotData = useMemo(() => {
    if (!loaded) return null;

    if (plotType === "surface") {
      return buildSurfacePlotData(
        rhsExpr,
        points,
        tRange,
        yRange,
        showSurface,
        showCurve,
        annotations
      );
    }

    if (plotType === "trajectory3d" || plotType === "trajectory2d_elevated") {
      return buildTrajectoryPlotData(
        trajectoryData,
        selectedVars,
        annotations
      );
    }

    return null;
  }, [
    loaded, plotType, rhsExpr, points, tRange, yRange,
    showSurface, showCurve, trajectoryData, selectedVars, annotations,
  ]);

  // ─── Render plot ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded || !plotData || !chartRef.current) return;
    const Plotly = plotlyRef.current;

    const layout = buildLayout(plotType, plotData.axisLabels || axisLabels);

    Plotly.react(chartRef.current, plotData.traces, layout, {
      responsive: true,
      displaylogo: false,
      displayModeBar: true,
      modeBarButtonsToRemove: ["sendDataToCloud", "toImage"],
    });

    // Click handler for point annotations
    const el = chartRef.current;
    const handleClick = (eventData) => {
      if (!pointMode || !eventData?.points?.[0]) return;
      const pt = eventData.points[0];
      setPendingPoint({
        x: pt.x,
        y: pt.y,
        z: pt.z ?? pt.y,
      });
      setAnnotationLabel("");
      // Focus input after render
      setTimeout(() => annotationInputRef.current?.focus(), 100);
    };

    el.on("plotly_click", handleClick);
    return () => el.removeAllListeners?.("plotly_click");
  }, [loaded, plotData, plotType, axisLabels, pointMode]);

  const confirmAnnotation = useCallback(() => {
    if (!pendingPoint) return;
    const label = annotationLabel.trim() || `P${annotations.length + 1}`;
    setAnnotations((prev) => [...prev, { ...pendingPoint, label }]);
    setPendingPoint(null);
    setAnnotationLabel("");
  }, [pendingPoint, annotationLabel, annotations]);

  const cancelAnnotation = useCallback(() => {
    setPendingPoint(null);
    setAnnotationLabel("");
  }, []);

  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
    setPendingPoint(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e) => {
      if (e.key === "Escape") {
        if (pendingPoint) cancelAnnotation();
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose, pendingPoint, cancelAnnotation]);

  useEffect(() => {
    if (!open || !loaded || !chartRef.current || !plotlyRef.current) return;
    const onResize = () => {
      plotlyRef.current.Plots.resize(chartRef.current);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, loaded, plotData]);

  const exportPNG = useCallback(() => {
    if (!chartRef.current || !plotlyRef.current) return;
    plotlyRef.current.downloadImage(chartRef.current, {
      format: "png",
      width: 1200,
      height: 800,
      filename: "numerika-3d-plot",
    });
  }, []);

  const handleVarChange = useCallback((axisIdx, varName) => {
    setSelectedVars((prev) => {
      const next = [...prev];
      next[axisIdx] = varName;
      return next;
    });
    if (onVarsChange) {
      const next = [...selectedVars];
      next[axisIdx] = varName;
      onVarsChange(next);
    }
  }, [selectedVars, onVarsChange]);

  const handleAnnotationKeyDown = useCallback((e) => {
    if (e.key === "Enter") confirmAnnotation();
    if (e.key === "Escape") cancelAnnotation();
  }, [confirmAnnotation, cancelAnnotation]);

  const titleParts = title.includes("—")
    ? title.split("—").map((s) => s.trim())
    : [title, null];

  if (!open) return null;

  return createPortal(
    <div className="plot3d-overlay" onClick={onClose} id="plot3d-overlay">
      <div
        className="plot3d-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        id="plot3d-modal"
      >
        <header className="plot3d-header">
          <div className="plot3d-header-brand">
            <div className="plot3d-header-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="plot3d-header-text">
              <span className="plot3d-header-eyebrow">Visualización interactiva</span>
              <h2 className="plot3d-header-title">
                {titleParts[0]}
                {titleParts[1] && <em> — {titleParts[1]}</em>}
              </h2>
              {subtitle && <span className="plot3d-header-subtitle">{subtitle}</span>}
            </div>
          </div>
          <span className="plot3d-header-badge">{badge}</span>
          <div className="plot3d-header-actions">
            <button
              type="button"
              className="plot3d-tool-btn plot3d-header-export"
              onClick={exportPNG}
              disabled={!loaded || !!error}
              id="plot3d-tool-export"
            >
              Exportar PNG
            </button>
            <button
              type="button"
              className="plot3d-close"
              onClick={onClose}
              aria-label="Cerrar"
              id="plot3d-close-btn"
            >
              ×
            </button>
          </div>
        </header>

        <div className="plot3d-toolbar">
          {plotType === "surface" && (
            <>
              <div className="plot3d-toolbar-group">
                <span className="plot3d-toolbar-group-label">Capas</span>
                <button
                  type="button"
                  className={`plot3d-layer-toggle ${showSurface ? "active" : ""}`}
                  onClick={() => setShowSurface((v) => !v)}
                  id="plot3d-toggle-surface"
                >
                  Superficie f(t,y)
                </button>
                <button
                  type="button"
                  className={`plot3d-layer-toggle ${showCurve ? "active" : ""}`}
                  onClick={() => setShowCurve((v) => !v)}
                  id="plot3d-toggle-curve"
                >
                  Curva solución
                </button>
              </div>
              <div className="plot3d-tool-divider" />
            </>
          )}

          <div className="plot3d-toolbar-group">
            <span className="plot3d-toolbar-group-label">Marcas</span>
            <button
              type="button"
              className={`plot3d-tool-btn ${pointMode ? "active" : ""}`}
              onClick={() => setPointMode((v) => !v)}
              title="Clic en el gráfico para colocar puntos con etiqueta"
              id="plot3d-tool-point"
            >
              {pointMode ? "Modo punto activo" : "Agregar puntos"}
            </button>
            {annotations.length > 0 && (
              <button
                type="button"
                className="plot3d-tool-btn plot3d-tool-btn--danger"
                onClick={clearAnnotations}
                id="plot3d-tool-clear"
              >
                Limpiar ({annotations.length})
              </button>
            )}
          </div>
        </div>

        {/* Variable selector (systems with >3 vars) */}
        {availableVars && availableVars.length > 3 && (
          <div className="plot3d-var-selector">
            <span className="plot3d-var-selector-label">Ejes del espacio</span>
            {["X", "Y", "Z"].map((axis, idx) => (
              <div key={axis} className="plot3d-var-field">
                <span className="plot3d-var-axis-label">{axis}</span>
                <select
                  className="plot3d-var-select"
                  value={selectedVars[idx] || availableVars[idx]}
                  onChange={(e) => handleVarChange(idx, e.target.value)}
                >
                  {availableVars.map((v) => (
                    <option key={v} value={v}>{v}(t)</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {annotations.length > 0 && loaded && !error && (
          <div className="plot3d-annotations-strip">
            <span className="plot3d-annotations-strip-label">Puntos</span>
            {annotations.map((a, i) => (
              <span key={i} className="plot3d-annotation-chip">{a.label}</span>
            ))}
          </div>
        )}

        {error ? (
          <div className="plot3d-loading plot3d-loading--error">
            <div className="plot3d-loading-icon">!</div>
            <span className="plot3d-loading-text">{error}</span>
          </div>
        ) : !loaded ? (
          <div className="plot3d-loading">
            <div className="plot3d-loading-spinner" />
            <span className="plot3d-loading-text">Preparando visualización 3D…</span>
          </div>
        ) : (
          <div className="plot3d-chart-wrap">
            <div className={`plot3d-chart ${pointMode ? "plot3d-chart--point-mode" : ""}`}>
              <div ref={chartRef} className="plot3d-chart-inner" />

              {pendingPoint && (
                <div className="plot3d-annotation-prompt">
                  <span className="plot3d-annotation-prompt-label">Etiqueta</span>
                  <input
                    ref={annotationInputRef}
                    className="plot3d-annotation-input"
                    type="text"
                    value={annotationLabel}
                    onChange={(e) => setAnnotationLabel(e.target.value)}
                    onKeyDown={handleAnnotationKeyDown}
                    placeholder="Ej: P1, máximo…"
                    maxLength={30}
                  />
                  <button
                    type="button"
                    className="plot3d-annotation-confirm"
                    onClick={confirmAnnotation}
                  >
                    Añadir
                  </button>
                  <button
                    type="button"
                    className="plot3d-annotation-cancel"
                    onClick={cancelAnnotation}
                    aria-label="Cancelar"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <footer className="plot3d-footer">
          <div className="plot3d-footer-hints">
            <span className="plot3d-hint-pill">
              <kbd>Arrastrar</kbd> rotar
            </span>
            <span className="plot3d-hint-pill">
              <kbd>Scroll</kbd> zoom
            </span>
            <span className="plot3d-hint-pill">
              <kbd>Clic der.</kbd> desplazar
            </span>
            {pointMode && (
              <span className="plot3d-hint-pill plot3d-hint-pill--active">
                Clic para marcar punto
              </span>
            )}
          </div>
          <span className="plot3d-powered">Plotly</span>
        </footer>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

function buildSurfacePlotData(
  rhsExpr, points, tRange, yRange, showSurface, showCurve, annotations
) {
  const traces = [];

  // 1. Surface z = f(t, y)
  if (showSurface && rhsExpr) {
    const surfaceData = generateSurfaceData(rhsExpr, tRange, yRange, 40);
    if (!surfaceData.error) {
      traces.push({
        type: "surface",
        x: surfaceData.tValues,
        y: surfaceData.yValues,
        z: surfaceData.zValues,
        colorscale: NUMERIKA_COLORSCALE,
        opacity: 0.82,
        lighting: {
          ambient: 0.65,
          diffuse: 0.85,
          specular: 0.25,
          roughness: 0.4,
        },
        showscale: true,
        colorbar: {
          len: 0.55,
          thickness: 14,
          outlinewidth: 0,
          tickfont: { family: "'DM Mono', monospace", size: 9, color: "#7a8a82" },
          title: {
            text: "f(t,y)",
            font: { family: "'DM Mono', monospace", size: 10, color: "#1A1F1E" },
          },
        },
        name: "Superficie f(t,y)",
        hovertemplate: "t=%{x:.3f}<br>y=%{y:.3f}<br>f(t,y)=%{z:.4f}<extra></extra>",
      });
    }
  }

  // 2. Solution curve in 3D
  if (showCurve && points?.length > 0 && rhsExpr) {
    const curve = generateSolutionCurve3D(points, rhsExpr);
    if (!curve.error) {
      traces.push({
        type: "scatter3d",
        mode: "lines",
        x: curve.t,
        y: curve.y,
        z: curve.z,
        line: {
          color: "#6CBDB5",
          width: 5,
        },
        name: "Solución y(t)",
        hovertemplate: "t=%{x:.3f}<br>y=%{y:.4f}<br>f=%{z:.4f}<extra>Solución</extra>",
      });

      // Start and end markers
      if (curve.t.length > 0) {
        traces.push({
          type: "scatter3d",
          mode: "markers+text",
          x: [curve.t[0], curve.t[curve.t.length - 1]],
          y: [curve.y[0], curve.y[curve.y.length - 1]],
          z: [curve.z[0], curve.z[curve.z.length - 1]],
          marker: {
            size: 5,
            color: ["#93CCC6", "#1A1F1E"],
            symbol: "circle",
          },
          text: ["t₀", "t_f"],
          textposition: "top center",
          textfont: { family: "'DM Mono', monospace", size: 10, color: "#7a8a82" },
          name: "Extremos",
          showlegend: false,
          hovertemplate: "%{text}<br>t=%{x:.3f}<br>y=%{y:.4f}<extra></extra>",
        });
      }
    }
  }

  // 3. User annotations
  if (annotations.length > 0) {
    traces.push({
      type: "scatter3d",
      mode: "markers+text",
      x: annotations.map((a) => a.x),
      y: annotations.map((a) => a.y),
      z: annotations.map((a) => a.z),
      marker: {
        size: 6,
        color: "#E3DFBA",
        line: { color: "#6CBDB5", width: 2 },
        symbol: "diamond",
      },
      text: annotations.map((a) => a.label),
      textposition: "top center",
      textfont: { family: "'DM Mono', monospace", size: 10, color: "#1A1F1E" },
      name: "Puntos",
      hovertemplate: "%{text}<br>(%{x:.3f}, %{y:.3f}, %{z:.3f})<extra></extra>",
    });
  }

  return {
    traces,
    axisLabels: ["t", "y", "f(t,y)"],
  };
}

function buildTrajectoryPlotData(trajectoryData, selectedVars, annotations) {
  const traces = [];

  if (trajectoryData?.x?.length > 0) {
    traces.push({
      type: "scatter3d",
      mode: "lines",
      x: trajectoryData.x,
      y: trajectoryData.y,
      z: trajectoryData.z,
      line: {
        color: trajectoryData.z,
        colorscale: NUMERIKA_COLORSCALE,
        width: 5,
        cmin: Math.min(...trajectoryData.z),
        cmax: Math.max(...trajectoryData.z),
      },
      name: "Trayectoria",
      hovertemplate:
        `${selectedVars[0]}=%{x:.4f}<br>` +
        `${selectedVars[1]}=%{y:.4f}<br>` +
        `${selectedVars[2]}=%{z:.4f}<extra></extra>`,
    });

    // Start/end markers
    const n = trajectoryData.x.length;
    if (n > 0) {
      traces.push({
        type: "scatter3d",
        mode: "markers+text",
        x: [trajectoryData.x[0], trajectoryData.x[n - 1]],
        y: [trajectoryData.y[0], trajectoryData.y[n - 1]],
        z: [trajectoryData.z[0], trajectoryData.z[n - 1]],
        marker: {
          size: 6,
          color: ["#93CCC6", "#1A1F1E"],
        },
        text: ["inicio", "fin"],
        textposition: "top center",
        textfont: { family: "'DM Mono', monospace", size: 10, color: "#7a8a82" },
        name: "Extremos",
        showlegend: false,
      });
    }
  }

  // User annotations
  if (annotations.length > 0) {
    traces.push({
      type: "scatter3d",
      mode: "markers+text",
      x: annotations.map((a) => a.x),
      y: annotations.map((a) => a.y),
      z: annotations.map((a) => a.z),
      marker: {
        size: 6,
        color: "#E3DFBA",
        line: { color: "#6CBDB5", width: 2 },
        symbol: "diamond",
      },
      text: annotations.map((a) => a.label),
      textposition: "top center",
      textfont: { family: "'DM Mono', monospace", size: 10, color: "#1A1F1E" },
      name: "Puntos",
    });
  }

  return {
    traces,
    axisLabels: selectedVars,
  };
}

function buildLayout(plotType, axisLabels) {
  const base = JSON.parse(JSON.stringify(NUMERIKA_3D_LAYOUT));

  base.scene.xaxis.title = { ...base.scene.xaxis.title, text: axisLabels[0] || "x" };
  base.scene.yaxis.title = { ...base.scene.yaxis.title, text: axisLabels[1] || "y" };
  base.scene.zaxis.title = { ...base.scene.zaxis.title, text: axisLabels[2] || "z" };

  base.legend = {
    font: { family: "'DM Mono', monospace", size: 9 },
    bgcolor: "rgba(250, 249, 242, 0.85)",
    bordercolor: "#dddbc8",
    borderwidth: 1,
  };

  if (plotType === "surface") {
    base.scene.camera = {
      eye: { x: 1.5, y: 1.5, z: 1.2 },
    };
  } else {
    base.scene.camera = {
      eye: { x: 1.8, y: 1.2, z: 0.9 },
    };
    base.scene.aspectmode = "data";
  }

  return base;
}
