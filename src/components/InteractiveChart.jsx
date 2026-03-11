import { useState } from "react";

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

export function InteractiveChart({ points, root, fnLabel }) {
  const [hovered, setHovered] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const valid = points.filter((p) => p.y !== null);
  if (valid.length < 2)
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

  const W = 580,
    H = 200;
  const pad = { t: 16, r: 16, b: 28, l: 44 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const xs = valid.map((p) => p.x),
    ys = valid.map((p) => p.y);
  const xMin = Math.min(...xs),
    xMax = Math.max(...xs);
  const yMin = Math.min(...ys),
    yMax = Math.max(...ys);
  const yRange = yMax - yMin || 1;
  const xRange = xMax - xMin || 1;

  const cx = (x) => pad.l + ((x - xMin) / xRange) * innerW;
  const cy = (y) => pad.t + innerH - ((y - yMin) / yRange) * innerH;

  const d = valid.map((p, i) => `${i === 0 ? "M" : "L"}${cx(p.x).toFixed(1)},${cy(p.y).toFixed(1)}`).join(" ");
  const zero = cy(0);
  const rootX = root !== null ? cx(root) : null;

  // Y-axis ticks
  const yTicks = 4;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => yMin + i * (yRange / yTicks));
  const xTicks = 5;
  const xTickVals = Array.from({ length: xTicks + 1 }, (_, i) => xMin + i * (xRange / xTicks));

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (W / rect.width);
    const svgY = (e.clientY - rect.top) * (H / rect.height);
    if (svgX < pad.l || svgX > W - pad.r) {
      setHovered(null);
      return;
    }
    const xVal = xMin + ((svgX - pad.l) / innerW) * xRange;
    // find nearest point
    let nearest = valid[0],
      minDist = Infinity;
    for (const p of valid) {
      const dist = Math.abs(p.x - xVal);
      if (dist < minDist) {
        minDist = dist;
        nearest = p;
      }
    }
    setHovered(nearest);
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

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
        {fnLabel}
        {root !== null && (
          <span style={{ marginLeft: "auto", color: C.teal, fontSize: 9 }}>raíz ≈ {root}</span>
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
          <g key={i}>
            <line x1={pad.l} y1={cy(v)} x2={W - pad.r} y2={cy(v)} stroke={C.border} strokeWidth={0.6} strokeDasharray="3,4" />
            <text x={pad.l - 5} y={cy(v) + 3.5} fontSize={8} fill={C.muted} textAnchor="end" fontFamily="monospace">
              {v.toFixed(1)}
            </text>
          </g>
        ))}
        {xTickVals.map((v, i) => (
          <g key={i}>
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

        {/* Root line */}
        {rootX && (
          <>
            <line x1={rootX} y1={pad.t} x2={rootX} y2={H - pad.b} stroke={C.teal} strokeWidth={1.5} strokeDasharray="5,3" opacity={0.8} />
            <circle cx={rootX} cy={zero >= pad.t && zero <= H - pad.b ? zero : H - pad.b} r={4} fill={C.teal} opacity={0.9} />
          </>
        )}

        {/* Curve */}
        <path d={d} fill="none" stroke={C.teal} strokeWidth={2} strokeLinejoin="round" />

        {/* Hover indicator */}
        {hovered && (
          <>
            <line x1={cx(hovered.x)} y1={pad.t} x2={cx(hovered.x)} y2={H - pad.b} stroke={C.dark} strokeWidth={0.8} strokeDasharray="2,3" opacity={0.4} />
            <circle cx={cx(hovered.x)} cy={cy(hovered.y)} r={4} fill={C.surface} stroke={C.teal} strokeWidth={2} />
          </>
        )}
      </svg>

      {/* Floating tooltip */}
      {hovered && (
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
            x = <strong style={{ color: C.cream }}>{hovered.x}</strong>
          </div>
          <div style={{ fontSize: 10, color: C.tealLt, fontFamily: "'DM Mono',monospace", marginTop: 2, letterSpacing: "0.5px" }}>
            f(x) = <strong style={{ color: C.cream }}>{hovered.y}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
