import { useState, useMemo, useCallback } from "react";
import React from "react";

const C = {
  cream: "#E3DFBA",
  sage: "#C8D6BF",
  tealLt: "#93CCC6",
  teal: "#6CBDB5",
  dark: "#1A1F1E",
  bg: "#f5f3e8",
  surface: "#faf9f2",
  border: "#dddbc8",
  muted: "#7a8a82",
  text: "#1A1F1E",
};

const W = 580, H = 200;
const pad = { t: 16, r: 16, b: 28, l: 44 };
const innerW = W - pad.l - pad.r;
const innerH = H - pad.t - pad.b;

/**
 * InteractiveChart — Gráfico SVG interactivo con tooltips al hover.
 * 
 * Características:
 * - Escala automática de ejes
 * - Líneas de grid con ticks
 * - Línea de raíz cuando root es válido
 * - Tooltip al pasar el mouse
 * - Memoizado para renderización eficiente
 * 
 * @param {Object} props
 * @param {Array<{x, y}>} props.points - Puntos de la función (y puede ser null)
 * @param {number} props.root - Raíz encontrada (si existe)
 * @param {string} props.fnLabel - Etiqueta f(x) = ... para display
 * 
 * @example
 * <InteractiveChart 
 *   points={[{x: 0, y: -2}, {x: 2, y: 0}]}
 *   root={2}
 *   fnLabel="f(x) = x² - x - 2"
 * />
 */
function InteractiveChartComponent({ points, root, fnLabel }) {
  const [hovered, setHovered] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Memoizar cálculos costosos
  const { valid, xMin, xMax, yMin, yMax, xRange, yRange } = useMemo(() => {
    const valid = points.filter((p) => p.y !== null);
    if (valid.length < 2) return { valid: [], xMin: 0, xMax: 1, yMin: 0, yMax: 1, xRange: 1, yRange: 1 };

    const xs = valid.map((p) => p.x);
    const ys = valid.map((p) => p.y);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);

    return {
      valid,
      xMin,
      xMax,
      yMin,
      yMax,
      xRange: xMax - xMin || 1,
      yRange: yMax - yMin || 1,
    };
  }, [points]);

  // Memoizar funciones de escala
  const cx = useCallback((x) => pad.l + ((x - xMin) / xRange) * innerW, [xMin, xRange]);
  const cy = useCallback((y) => pad.t + innerH - ((y - yMin) / yRange) * innerH, [yMin, yRange]);

  // Memoizar ticks
  const yTickVals = useMemo(
    () => Array.from({ length: 5 }, (_, i) => yMin + i * (yRange / 4)),
    [yMin, yRange]
  );
  const xTickVals = useMemo(
    () => Array.from({ length: 6 }, (_, i) => xMin + i * (xRange / 5)),
    [xMin, xRange]
  );

  // Memoizar path SVG
  const curveD = useMemo(
    () => valid.map((p, i) => `${i === 0 ? "M" : "L"}${cx(p.x).toFixed(1)},${cy(p.y).toFixed(1)}`).join(" "),
    [valid, cx, cy]
  );

  const zero = cy(0);
  const rootX = root !== null && Number.isFinite(root) ? cx(root) : null;

  // Memoizar handler
  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (W / rect.width);
    const svgY = (e.clientY - rect.top) * (H / rect.height);

    if (svgX < pad.l || svgX > W - pad.r) {
      setHovered(null);
      return;
    }

    const xVal = xMin + ((svgX - pad.l) / innerW) * xRange;
    let nearest = valid[0];
    let minDist = Infinity;

    for (const p of valid) {
      const dist = Math.abs(p.x - xVal);
      if (dist < minDist) {
        minDist = dist;
        nearest = p;
      }
    }

    setHovered(nearest);
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [valid, xMin, xRange]);

  // Sanitizar fnLabel para XSS prevention
  const safeFnLabel = String(fnLabel).substring(0, 100).replace(/</g, "&lt;").replace(/>/g, "&gt;");

  if (valid.length < 2) {
    return (
      <div
        style={{
          height: 220,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          color: C.muted,
        }}
      >
        Sin datos para graficar
      </div>
    );
  }

  return (
    <div style={{ position: "relative", userSelect: "none" }}>
      {/* Label */}
      <div
        style={{
          fontSize: 9,
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ display: "inline-block", width: 16, height: 1.5, background: C.teal }} />
        {safeFnLabel}
        {root !== null && Number.isFinite(root) && (
          <span style={{ marginLeft: "auto", color: C.teal, fontSize: 9 }}>
            raíz ≈ {(+root).toFixed(6)}
          </span>
        )}
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Grid lines */}
        {yTickVals.map((v, i) => (
          <g key={`yGrid-${i}`}>
            <line x1={pad.l} y1={cy(v)} x2={W - pad.r} y2={cy(v)} stroke={C.border} strokeWidth={0.6} strokeDasharray="3,4" />
            <text x={pad.l - 5} y={cy(v) + 3.5} fontSize={8} fill={C.muted} textAnchor="end" fontFamily="monospace">
              {v.toFixed(1)}
            </text>
          </g>
        ))}
        {xTickVals.map((v, i) => (
          <g key={`xGrid-${i}`}>
            <line x1={cx(v)} y1={pad.t} x2={cx(v)} y2={H - pad.b} stroke={C.border} strokeWidth={0.6} strokeDasharray="3,4" />
            <text x={cx(v)} y={H - pad.b + 12} fontSize={8} fill={C.muted} textAnchor="middle" fontFamily="monospace">
              {v.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Axes */}
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={H - pad.b} stroke={C.border} strokeWidth={1} />
        <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke={C.border} strokeWidth={1} />

        {/* Zero line */}
        {zero >= pad.t && zero <= H - pad.b && (
          <line x1={pad.l} y1={zero} x2={W - pad.r} y2={zero} stroke={C.muted} strokeWidth={1} strokeDasharray="5,3" opacity={0.6} />
        )}

        {/* Root line and point */}
        {rootX && (
          <>
            <line x1={rootX} y1={pad.t} x2={rootX} y2={H - pad.b} stroke={C.teal} strokeWidth={1.5} strokeDasharray="5,3" opacity={0.8} />
            <circle cx={rootX} cy={zero >= pad.t && zero <= H - pad.b ? zero : H - pad.b} r={4} fill={C.teal} opacity={0.9} />
          </>
        )}

        {/* Curve */}
        <path d={curveD} fill="none" stroke={C.teal} strokeWidth={2} strokeLinejoin="round" />

        {/* Hover indicator */}
        {hovered && (
          <>
            <line x1={cx(hovered.x)} y1={pad.t} x2={cx(hovered.x)} y2={H - pad.b} stroke={C.dark} strokeWidth={0.8} strokeDasharray="2,3" opacity={0.4} />
            <circle cx={cx(hovered.x)} cy={cy(hovered.y)} r={4} fill={C.surface} stroke={C.teal} strokeWidth={2} />
          </>
        )}
      </svg>

      {/* Tooltip */}
      {hovered && Number.isFinite(hovered.x) && Number.isFinite(hovered.y) && (
        <div
          style={{
            position: "absolute",
            top: Math.min(mousePos.y - 52, 140),
            left: Math.min(mousePos.x + 12, 420),
            background: C.dark,
            borderRadius: 8,
            padding: "8px 14px",
            pointerEvents: "none",
            zIndex: 10,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          }}
        >
          <div style={{ fontSize: 10, color: C.tealLt, fontFamily: "'DM Mono',monospace", letterSpacing: "0.5px" }}>
            x = <strong style={{ color: C.cream }}>{hovered.x.toFixed(3)}</strong>
          </div>
          <div style={{ fontSize: 10, color: C.tealLt, fontFamily: "'DM Mono',monospace", marginTop: 2, letterSpacing: "0.5px" }}>
            f(x) = <strong style={{ color: C.cream }}>{hovered.y.toFixed(3)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

// Memoized export para evitar re-renders innecesarios
export const InteractiveChart = React.memo(InteractiveChartComponent);
