import React, { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";

// ─── Componente Principal ─────────────────────────────────────────────────────
// Modelo: Una viga simplemente apoyada bajo carga distribuida.
// Se busca la deflexión x (en metros) donde la curva elástica cumple f(x) = 0.
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

  // ─── Puntos para el gráfico ─────────────────────────
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
    <div className="sim-container">

      {/* ── Descripción del Método ─────────────────────────────────────────── */}
      <div className="sim-desc-box sage">
        <div className="sim-desc-header">
          <span className="sim-eyebrow">Modelo Matemático</span>
          <span className="sim-tag sim-tag-sage">
            Secante
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.8, margin: "10px 0 6px" }}>
          Dada una viga simplemente apoyada de longitud <strong>L</strong> bajo
          carga distribuida <strong>w</strong>, la ecuación de la elástica
          describe la deflexión en cada punto <strong>x</strong>:
        </p>
        <div className="sim-formula-box">
          y(x) = w / (24·E·I) · (x⁴ − 2L·x³ + L³·x)
        </div>
        <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.7, marginTop: 10 }}>
          Se busca la posición <strong>x*</strong> donde la deflexión iguala
          el valor objetivo δ, resolviendo <strong>f(x) = y(x) − δ = 0</strong>.{" "}
          El método de <strong>Secante</strong> aproxima la derivada usando
          dos puntos iniciales x₀ y x₁, sin necesidad de calcular f′(x) analíticamente.
        </p>
      </div>

      {/* ── Grid Principal ────────────────────────────────────────────────── */}
      <div className="sim-grid">

        {/* ── Panel de Configuración ── */}
        <div className="sim-panel">
          <div className="sim-panel-header">
            <span className="sim-eyebrow">Parámetros Estructurales</span>
            <span className="sim-tag sim-tag-sage">
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

            <div className="sim-divider" />
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

            <div className="sim-divider" />
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
        <div className="sim-panel">
          <div className="sim-panel-header">
            <span className="sim-eyebrow">Resultado</span>
            {result && (
              <span style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "1px" }}>
                {result.totalIter} iteración{result.totalIter !== 1 ? "es" : ""}
              </span>
            )}
          </div>
          <div style={{ padding: 20 }}>
            {!result ? (
              <div className="sim-placeholder">
                <p className="sim-placeholder-text">
                  Ajustá los parámetros para calcular
                </p>
              </div>
            ) : (
              <>
                {/* Status */}
                <div className="sim-status" style={{
                  background: result.converged ? "rgba(108,189,181,0.1)" : "rgba(220,180,100,0.1)",
                  border: `1px solid ${result.converged ? "rgba(108,189,181,0.3)" : "rgba(220,180,100,0.3)"}`,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: result.converged ? "var(--teal)" : "#d4a84b", flexShrink: 0 }} />
                  <span style={{ color: result.converged ? "var(--teal)" : "#d4a84b", fontSize: 10, letterSpacing: "1px", textTransform: "uppercase" }}>
                    {result.converged
                      ? `Posición hallada · x* ≈ ${result.root.toFixed(4)} m`
                      : `Sin convergencia tras ${result.totalIter} iteraciones`}
                  </span>
                </div>

                {/* Métricas rápidas */}
                <div className="sim-metrics-row">
                  <Metric label="Posición x*" value={`${result.root.toFixed(4)} m`} highlight />
                  <Metric label="Deflexión máx." value={`${(result.deflexionMax * 1000).toFixed(2)} mm`} />
                  <Metric label="Rigidez E·I" value={`${(result.EI / 1e6).toFixed(1)} MN·m²`} />
                </div>

                {/* Curva Elástica */}
                <div className="sim-graph">
                  <div className="sim-graph-title">
                    Curva elástica y(x) · deflexión en metros
                  </div>
                  <ResponsiveContainer width="100%" height={175}>
                    <LineChart data={graphPoints} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
                      <XAxis dataKey="x" tick={{ fontSize: 9, fill: "var(--muted)", fontFamily: "'DM Mono', monospace" }} label={{ value: "x (m)", position: "insideBottomRight", offset: -5, fontSize: 9, fill: "var(--muted)" }} />
                      <YAxis tick={{ fontSize: 9, fill: "var(--muted)", fontFamily: "'DM Mono', monospace" }} />
                      <Tooltip
                        contentStyle={{ fontSize: 10, borderRadius: 8, fontFamily: "'DM Mono', monospace", border: `1px solid var(--border)`, background: "var(--surface)" }}
                        labelFormatter={(v) => `x = ${v} m`}
                        formatter={(v) => [`y = ${v} m`, ""]}
                      />
                      <ReferenceLine
                        y={params.delta}
                        stroke="#C8D6BF"
                        strokeDasharray="5 3"
                        strokeWidth={1.5}
                        label={{ value: `δ=${params.delta}`, position: "right", fontSize: 9, fill: "var(--muted)" }}
                      />
                      {result.converged && (
                        <ReferenceLine
                          x={parseFloat(result.root.toFixed(3))}
                          stroke="#6CBDB5"
                          strokeDasharray="5 3"
                          strokeWidth={1.5}
                          label={{ value: `x*=${result.root.toFixed(2)}`, position: "top", fontSize: 9, fill: "#6CBDB5" }}
                        />
                      )}
                      <Line type="monotone" dataKey="y" stroke="#6CBDB5" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Tabla de Iteraciones */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span className="sim-eyebrow">Tabla de Iteraciones</span>
                    <button
                      className="sim-btn-toggle"
                      onClick={() => setShowAllIter(v => !v)}
                    >
                      {showAllIter ? "Mostrar últimas 5" : `Ver todas (${result.iterations.length})`}
                    </button>
                  </div>
                  <div className="sim-table-wrap">
                    <table className="sim-table">
                      <thead>
                        <tr>
                          {["n", "x₀", "x₁", "x₂", "f(x₂)", "Error %"].map(h => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayedIter.map((row, i) => (
                          <tr key={i} style={{ background: row.converged ? "rgba(108,189,181,0.07)" : "transparent" }}>
                            <td>{row.n}</td>
                            <td>{row.x0}</td>
                            <td>{row.x1}</td>
                            <td>{row.x2}</td>
                            <td>{row.fx2}</td>
                            <td style={{ color: row.converged ? "var(--teal)" : "var(--text)", fontWeight: row.converged ? 500 : 400 }}>
                              {row.err === "0.000000" ? "—" : `${row.err}%`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Insight */}
                <div className="sim-ai-box">
                  <div className="sim-ai-label">
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--sage)", display: "inline-block", marginRight: 6 }} />
                    Interpretación Estructural
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.8 }}>
                    La viga de <strong>{params.L} m</strong> con
                    E = <strong>{params.E} GPa</strong> e
                    I = <strong>{params.I} m⁴</strong> alcanza
                    la deflexión objetivo de <strong>{params.delta * 1000} mm</strong> en{" "}
                    <strong style={{ color: "var(--teal)" }}>x* = {result.root.toFixed(4)} m</strong> desde el apoyo.
                    La deflexión máxima (en L/2) es{" "}
                    <strong>{(result.deflexionMax * 1000).toFixed(3)} mm</strong>.
                    El método Secante convergió en{" "}
                    <strong>{result.totalIter} iteraciones</strong> sin requerir derivada analítica.
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
    <div className="sim-section-label">
      {text}
    </div>
  );
}

function Metric({ label, value, highlight }) {
  return (
    <div className={`sim-metric ${highlight ? 'highlight' : ''}`}>
      <div className="sim-metric-label">{label}</div>
      <div className="sim-metric-val">{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, hint, step = 1 }) {
  return (
    <div className="sim-field">
      <label className="sim-field-label">
        {label}
      </label>
      <input
        type="number"
        step={step}
        className="sim-field-input"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
      {hint && <div className="sim-field-hint">{hint}</div>}
    </div>
  );
}