import React, { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";

// ─── Paleta NumérikaAI ────────────────────────────────────────────────────────
const C = {
  cream: "#E3DFBA", sage: "#C8D6BF", teal: "#6CBDB5",
  dark: "#1A1F1E", bg: "#f5f3e8", surface: "#faf9f2",
  border: "#dddbc8", muted: "#7a8a82", text: "#1A1F1E",
};

// ─── Componente Principal ─────────────────────────────────────────────────────
// Modelo: Una viga simplemente apoyada bajo carga distribuida.
// Se busca la deflexión x (en metros) donde la curva elástica cumple f(x) = 0.
// f(x) = E·I·y''(x) + M(x) = 0 simplificado como:
// f(x) = P·x³ - (3/2)·P·L·x² + C₁
// donde C₁ = (P·L³)/2 - E·I·δ_max = 0 en el punto de deflexión máxima.
//
// Para hacerlo concreto y educativo, usamos la forma directa:
// f(x) = w·x⁴/(24·E·I) - w·L·x³/(12·E·I) + w·L³·x/(24·E·I) - δ_obj = 0
// Buscamos x donde la deflexión elástica alcanza el valor objetivo δ_obj.

export default function AnalizadorEstructura() {
  const [params, setParams] = useState({
    E: 200,        // Módulo de elasticidad (GPa) — acero estructural
    I: 0.0004,     // Momento de inercia (m⁴)
    w: 15000,      // Carga distribuida (N/m)
    L: 6,          // Longitud de la viga (m)
    delta: 0.01,   // Deflexión objetivo (m)
    x0: 1.0,       // Primer punto inicial
    x1: 2.5,       // Segundo punto inicial
  });

  const [result, setResult] = useState(null);
  const [showAllIter, setShowAllIter] = useState(false);

  // ─── Motor Secante ────────────────────────────────────────────────────────
  const calcularPosicion = () => {
    const { E, I, w, L, delta, x0, x1 } = params;

    const EI = E * 1e9 * I; // convertir GPa a Pa
    if (EI <= 0 || w <= 0 || L <= 0) { setResult(null); return; }

    // Ecuación de la elástica: y(x) = w/(24EI) * (x⁴ - 2Lx³ + L³x)
    // f(x) = y(x) - δ_obj = 0
    const f = (x) =>
      (w / (24 * EI)) * (Math.pow(x, 4) - 2 * L * Math.pow(x, 3) + Math.pow(L, 3) * x) - delta;

    let xPrev = parseFloat(x0);
    let xCurr = parseFloat(x1);
    const tol = 0.000001;
    const iterations = [];
    let converged = false;

    for (let i = 0; i < 50; i++) {
      const f0 = f(xPrev);
      const f1 = f(xCurr);
      const denom = f1 - f0;

      if (Math.abs(denom) < 1e-14) break;

      const xNext = xCurr - f1 * (xCurr - xPrev) / denom;
      if (!isFinite(xNext)) break;

      const err = Math.abs((xNext - xCurr) / xNext) * 100;

      iterations.push({
        n: i + 1,
        x0: xPrev.toFixed(6),
        x1: xCurr.toFixed(6),
        x2: xNext.toFixed(6),
        fx2: f(xNext).toFixed(8),
        err: err.toFixed(6),
        converged: err < tol * 100,
      });

      if (err < tol * 100) {
        converged = true;
        xCurr = xNext;
        break;
      }

      xPrev = xCurr;
      xCurr = xNext;
    }

    // Deflexión máxima real (en x = L/2 para carga uniforme)
    const xMax = L / 2;
    const deflexionMax = (w / (24 * EI)) *
      (Math.pow(xMax, 4) - 2 * L * Math.pow(xMax, 3) + Math.pow(L, 3) * xMax);

    setResult({
      root: xCurr,
      iterations,
      converged,
      totalIter: iterations.length,
      deflexionMax,
      EI,
    });
  };

  useEffect(() => {
    calcularPosicion();
  }, [params]);

  // ─── Puntos para el gráfico: curva elástica y(x) ─────────────────────────
  const graphPoints = useMemo(() => {
    const { E, I, w, L } = params;
    const EI = E * 1e9 * I;
    if (EI <= 0 || L <= 0) return [];
    const steps = 100;
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * L;
      const y = (w / (24 * EI)) * (Math.pow(x, 4) - 2 * L * Math.pow(x, 3) + Math.pow(L, 3) * x);
      if (isFinite(y)) {
        points.push({ x: parseFloat(x.toFixed(3)), y: parseFloat(y.toFixed(6)) });
      }
    }
    return points;
  }, [params]);

  const displayedIter = showAllIter
    ? result?.iterations
    : result?.iterations.slice(-5);

  return (
    <div style={{ fontFamily: "'DM Mono', monospace", color: C.text }}>

      {/* ── Descripción del Método ─────────────────────────────────────────── */}
      <div style={descBoxStyle}>
        <div style={descHeaderStyle}>
          <span style={eyebrowStyle}>Modelo Matemático</span>
          <span style={{ ...tagStyle, color: "#6a8a6a", background: "rgba(200,214,191,0.15)", border: "1px solid rgba(200,214,191,0.4)" }}>
            Secante
          </span>
        </div>
        <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.8, margin: "10px 0 6px" }}>
          Dada una viga simplemente apoyada de longitud <strong style={{ color: C.text }}>L</strong> bajo
          carga distribuida <strong style={{ color: C.text }}>w</strong>, la ecuación de la elástica
          describe la deflexión en cada punto <strong style={{ color: C.text }}>x</strong>:
        </p>
        <div style={formulaBoxStyle}>
          y(x) = w / (24·E·I) · (x⁴ − 2L·x³ + L³·x)
        </div>
        <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.7, marginTop: 10 }}>
          Se busca la posición <strong style={{ color: C.text }}>x*</strong> donde la deflexión iguala
          el valor objetivo δ, resolviendo <strong style={{ color: C.text }}>f(x) = y(x) − δ = 0</strong>.{" "}
          El método de <strong style={{ color: C.text }}>Secante</strong> aproxima la derivada usando
          dos puntos iniciales x₀ y x₁, sin necesidad de calcular f′(x) analíticamente.
        </p>
      </div>

      {/* ── Grid Principal ────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>

        {/* ── Panel de Configuración ── */}
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <span style={eyebrowStyle}>Parámetros Estructurales</span>
            <span style={{ ...tagStyle, color: "#6a8a6a", background: "rgba(200,214,191,0.15)" }}>
              Viga
            </span>
          </div>
          <div style={{ padding: 20 }}>

            <SectionLabel text="Material" />
            <Field
              label="Módulo de elasticidad E (GPa)"
              value={params.E}
              onChange={v => setParams({ ...params, E: v })}
              hint="Acero ≈ 200 GPa · Hormigón ≈ 30 GPa"
              step={10}
            />
            <Field
              label="Momento de inercia I (m⁴)"
              value={params.I}
              onChange={v => setParams({ ...params, I: v })}
              hint="Depende del perfil transversal"
              step={0.0001}
            />

            <div style={dividerStyle} />
            <SectionLabel text="Carga y Geometría" />
            <Field
              label="Carga distribuida w (N/m)"
              value={params.w}
              onChange={v => setParams({ ...params, w: v })}
              hint="Carga uniforme sobre la viga"
              step={500}
            />
            <Field
              label="Longitud de la viga L (m)"
              value={params.L}
              onChange={v => setParams({ ...params, L: v })}
              hint="Distancia entre apoyos"
              step={0.5}
            />
            <Field
              label="Deflexión objetivo δ (m)"
              value={params.delta}
              onChange={v => setParams({ ...params, delta: v })}
              hint="Valor de deflexión a encontrar"
              step={0.001}
            />

            <div style={dividerStyle} />
            <SectionLabel text="Puntos Iniciales (Secante)" />
            <Field
              label="x₀ (m)"
              value={params.x0}
              onChange={v => setParams({ ...params, x0: v })}
              hint="Primer punto dentro de [0, L]"
              step={0.1}
            />
            <Field
              label="x₁ (m)"
              value={params.x1}
              onChange={v => setParams({ ...params, x1: v })}
              hint="Segundo punto dentro de [0, L]"
              step={0.1}
            />

          </div>
        </div>

        {/* ── Panel de Resultados ── */}
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <span style={eyebrowStyle}>Resultado</span>
            {result && (
              <span style={{ fontSize: 9, color: C.muted, letterSpacing: "1px" }}>
                {result.totalIter} iteración{result.totalIter !== 1 ? "es" : ""}
              </span>
            )}
          </div>
          <div style={{ padding: 20 }}>
            {!result ? (
              <div style={placeholderStyle}>
                <p style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: C.muted }}>
                  Ajustá los parámetros para calcular
                </p>
              </div>
            ) : (
              <>
                {/* Status */}
                <div style={{
                  ...statusBarStyle,
                  background: result.converged ? "rgba(108,189,181,0.1)" : "rgba(220,180,100,0.1)",
                  border: `1px solid ${result.converged ? "rgba(108,189,181,0.3)" : "rgba(220,180,100,0.3)"}`,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: result.converged ? C.teal : "#d4a84b", flexShrink: 0 }} />
                  <span style={{ color: result.converged ? C.teal : "#d4a84b", fontSize: 10, letterSpacing: "1px", textTransform: "uppercase" }}>
                    {result.converged
                      ? `Posición hallada · x* ≈ ${result.root.toFixed(4)} m`
                      : `Sin convergencia tras ${result.totalIter} iteraciones`}
                  </span>
                </div>

                {/* Métricas rápidas */}
                <div style={metricsRowStyle}>
                  <Metric label="Posición x*" value={`${result.root.toFixed(4)} m`} highlight />
                  <Metric label="Deflexión máx." value={`${(result.deflexionMax * 1000).toFixed(2)} mm`} />
                  <Metric label="Rigidez E·I" value={`${(result.EI / 1e6).toFixed(1)} MN·m²`} />
                </div>

                {/* Curva Elástica */}
                <div style={graphContainerStyle}>
                  <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>
                    Curva elástica y(x) · deflexión en metros
                  </div>
                  <ResponsiveContainer width="100%" height={175}>
                    <LineChart data={graphPoints} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid stroke={C.border} strokeDasharray="4 4" />
                      <XAxis dataKey="x" tick={{ fontSize: 9, fill: C.muted, fontFamily: "'DM Mono', monospace" }} label={{ value: "x (m)", position: "insideBottomRight", offset: -5, fontSize: 9, fill: C.muted }} />
                      <YAxis tick={{ fontSize: 9, fill: C.muted, fontFamily: "'DM Mono', monospace" }} />
                      <Tooltip
                        contentStyle={{ fontSize: 10, borderRadius: 8, fontFamily: "'DM Mono', monospace", border: `1px solid ${C.border}`, background: C.surface }}
                        labelFormatter={(v) => `x = ${v} m`}
                        formatter={(v) => [`y = ${v} m`, ""]}
                      />
                      <ReferenceLine
                        y={params.delta}
                        stroke={C.sage}
                        strokeDasharray="5 3"
                        strokeWidth={1.5}
                        label={{ value: `δ=${params.delta}`, position: "right", fontSize: 9, fill: C.muted }}
                      />
                      {result.converged && (
                        <ReferenceLine
                          x={parseFloat(result.root.toFixed(3))}
                          stroke={C.teal}
                          strokeDasharray="5 3"
                          strokeWidth={1.5}
                          label={{ value: `x*=${result.root.toFixed(2)}`, position: "top", fontSize: 9, fill: C.teal }}
                        />
                      )}
                      <Line type="monotone" dataKey="y" stroke={C.teal} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Tabla de Iteraciones */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={eyebrowStyle}>Tabla de Iteraciones</span>
                    <button
                      style={toggleBtnStyle}
                      onClick={() => setShowAllIter(v => !v)}
                    >
                      {showAllIter ? "Mostrar últimas 5" : `Ver todas (${result.iterations.length})`}
                    </button>
                  </div>
                  <div style={{ maxHeight: 220, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
                      <thead style={{ position: "sticky", top: 0, background: C.surface, zIndex: 1 }}>
                        <tr>
                          {["n", "x₀", "x₁", "x₂", "f(x₂)", "Error %"].map(h => (
                            <th key={h} style={thStyle}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayedIter.map((row, i) => (
                          <tr key={i} style={{ background: row.converged ? "rgba(108,189,181,0.07)" : "transparent" }}>
                            <td style={tdStyle}>{row.n}</td>
                            <td style={tdStyle}>{row.x0}</td>
                            <td style={tdStyle}>{row.x1}</td>
                            <td style={tdStyle}>{row.x2}</td>
                            <td style={tdStyle}>{row.fx2}</td>
                            <td style={{ ...tdStyle, color: row.converged ? C.teal : C.text, fontWeight: row.converged ? 500 : 400 }}>
                              {row.err === "0.000000" ? "—" : `${row.err}%`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Insight */}
                <div style={aiBoxStyle}>
                  <div style={aiLabelStyle}>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.sage, display: "inline-block", marginRight: 6 }} />
                    Interpretación Estructural
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: C.muted, lineHeight: 1.8 }}>
                    La viga de <strong style={{ color: C.text }}>{params.L} m</strong> con
                    E = <strong style={{ color: C.text }}>{params.E} GPa</strong> e
                    I = <strong style={{ color: C.text }}>{params.I} m⁴</strong> alcanza
                    la deflexión objetivo de <strong style={{ color: C.text }}>{params.delta * 1000} mm</strong> en{" "}
                    <strong style={{ color: C.teal }}>x* = {result.root.toFixed(4)} m</strong> desde el apoyo.
                    La deflexión máxima (en L/2) es{" "}
                    <strong style={{ color: C.text }}>{(result.deflexionMax * 1000).toFixed(3)} mm</strong>.
                    El método Secante convergió en{" "}
                    <strong style={{ color: C.text }}>{result.totalIter} iteraciones</strong> sin requerir derivada analítica.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────
function SectionLabel({ text }) {
  return (
    <div style={{ fontSize: 8, letterSpacing: "2.5px", textTransform: "uppercase", color: C.teal, marginBottom: 10, marginTop: 4 }}>
      {text}
    </div>
  );
}

function Metric({ label, value, highlight }) {
  return (
    <div style={{ background: highlight ? "rgba(108,189,181,0.08)" : C.bg, border: `1px solid ${highlight ? "rgba(108,189,181,0.3)" : C.border}`, borderRadius: 8, padding: "10px 14px", flex: 1 }}>
      <div style={{ fontSize: 8, letterSpacing: "2px", textTransform: "uppercase", color: C.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: highlight ? C.teal : C.text, fontFamily: "'DM Mono', monospace" }}>{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, hint, step = 1 }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 9, textTransform: "uppercase", letterSpacing: "1.5px", color: C.muted, marginBottom: 5 }}>
        {label}
      </label>
      <input
        type="number"
        step={step}
        style={{
          width: "100%", background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "9px 12px",
          fontFamily: "'DM Mono', monospace", fontSize: 13, color: C.text,
          outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
        }}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        onFocus={e => e.target.style.borderColor = C.teal}
        onBlur={e => e.target.style.borderColor = C.border}
      />
      {hint && <div style={{ fontSize: 9, color: C.muted, marginTop: 3, letterSpacing: "0.3px" }}>{hint}</div>}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const panelStyle = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" };
const panelHeaderStyle = { padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" };
const eyebrowStyle = { fontSize: 9, letterSpacing: "2.5px", textTransform: "uppercase", color: C.muted };
const tagStyle = { fontSize: 9, letterSpacing: "1px", textTransform: "uppercase", padding: "3px 10px", borderRadius: 20 };
const dividerStyle = { borderTop: `1px solid ${C.border}`, margin: "16px 0" };
const statusBarStyle = { display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", borderRadius: 8, marginBottom: 16 };
const metricsRowStyle = { display: "flex", gap: 10, marginBottom: 16 };
const graphContainerStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 10px 6px", marginBottom: 4 };
const placeholderStyle = { display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 };
const aiBoxStyle = { padding: "14px 16px", background: "rgba(200,214,191,0.15)", border: "1px solid rgba(200,214,191,0.4)", borderRadius: 8, marginTop: 16 };
const aiLabelStyle = { fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "#6a8a6a", marginBottom: 6, display: "flex", alignItems: "center" };
const toggleBtnStyle = { fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: C.teal, background: "transparent", border: `1px solid rgba(108,189,181,0.4)`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "'DM Mono', monospace" };
const descBoxStyle = { background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.sage}`, borderRadius: 8, padding: "18px 20px", marginBottom: 24 };
const descHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const formulaBoxStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 16px", fontSize: 12, letterSpacing: "0.5px", color: C.dark, fontFamily: "'DM Mono', monospace", marginTop: 10 };
const thStyle = { fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: C.muted, textAlign: "left", padding: "10px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: 500, whiteSpace: "nowrap" };
const tdStyle = { padding: "9px 12px", borderBottom: `1px solid rgba(221,219,200,0.5)`, color: C.text, fontSize: 11 };