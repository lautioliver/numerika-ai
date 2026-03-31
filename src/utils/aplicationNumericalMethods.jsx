import React, { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function SimuladorMultas() {
  const [params, setParams] = useState({
    rho: 5000,    // Densidad poblacional (hab/km²)
    beta: 0.5,    // Tasa vehicular (vehículos/hab)
    k: 1000,      // Multa base ($)
    L: 4500,      // Multa objetivo ($)
    alpha: 100,   // Sensibilidad al riesgo
  });

  const [result, setResult] = useState(null);
  const [showAllIter, setShowAllIter] = useState(false);

  // ─── Motor Newton-Raphson ─────────────────────────────────────────────────
  const calcularEquilibrio = () => {
    const { rho, beta, k, L, alpha } = params;

    if (L <= k || rho <= 0 || beta <= 0 || alpha <= 0) {
      setResult(null);
      return;
    }

    // f(σ) = k + α·(ρ·β / σ) - L = 0
    // Despejando σ: σ* = α·ρ·β / (L - k)
    const f = (s) => k + (alpha * (rho * beta) / s) - L;
    const fDeriv = (s) => -(alpha * (rho * beta)) / (s * s);

    let sigma = 5.0;
    const tol = 0.0001;
    const iterations = [];
    let converged = false;

    for (let i = 0; i < 50; i++) {
      const y = f(sigma);
      const d = fDeriv(sigma);
      if (Math.abs(d) < 1e-10) break;

      const nextSigma = sigma - y / d;
      if (!isFinite(nextSigma) || nextSigma <= 0) break;

      const error = Math.abs((nextSigma - sigma) / nextSigma) * 100;
      iterations.push({
        n: i + 1,
        sigma: sigma.toFixed(6),
        fs: y.toFixed(6),
        fpx: d.toFixed(6),
        error: error.toFixed(4),
        converged: error < tol,
      });

      if (error < tol) {
        converged = true;
        sigma = nextSigma;
        break;
      }
      sigma = nextSigma;
    }

    setResult({ root: sigma, iterations, converged, totalIter: iterations.length });
  };

  useEffect(() => {
    calcularEquilibrio();
  }, [params]);

  // ─── Puntos para el gráfico ───────────────────────────────────────────────
  const graphPoints = useMemo(() => {
    if (!result) return [];
    const root = result.root;
    const start = Math.max(0.5, root - root * 0.6);
    const end = root + root * 0.6;
    const steps = 80;
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const s = start + (i / steps) * (end - start);
      const val = params.k + (params.alpha * (params.rho * params.beta) / s) - params.L;
      if (isFinite(val) && Math.abs(val) < 1e6) {
        points.push({ x: parseFloat(s.toFixed(3)), y: parseFloat(val.toFixed(3)) });
      }
    }
    return points;
  }, [params, result]);

  const displayedIter = showAllIter
    ? result?.iterations
    : result?.iterations.slice(-5);

  return (
    <div className="sim-container">

      {/* ── Descripción del Método ─────────────────────────────────────────── */}
      <div className="sim-desc-box">
        <div className="sim-desc-header">
          <span className="sim-eyebrow">Modelo Matemático</span>
          <span className="sim-tag sim-tag-teal">
            Newton-Raphson
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.8, margin: "10px 0 6px" }}>
          Dado un territorio con densidad <strong>ρ</strong> hab/km² y tasa
          vehicular <strong>β</strong>, el modelo busca la densidad óptima de
          infraestructura de control <strong>σ*</strong> tal que el costo de
          operación se equilibre con la multa objetivo <strong>L</strong>:
        </p>
        <div className="sim-formula-box">
          f(σ) = k + α · (ρ · β / σ) − L = 0
        </div>
        <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.7, marginTop: 8 }}>
          El método de <strong>Newton-Raphson</strong> itera usando la derivada
          analítica f′(σ) = −α·ρ·β / σ² para converger cuadráticamente a la solución.
        </p>
      </div>

      {/* ── Grid Principal ────────────────────────────────────────────────── */}
      <div className="sim-grid">

        {/* ── Panel de Configuración ── */}
        <div className="sim-panel">
          <div className="sim-panel-header">
            <span className="sim-eyebrow">Variables Urbanas</span>
            <span className="sim-tag sim-tag-sage">
              Modelo 1.0
            </span>
          </div>
          <div style={{ padding: 20 }}>

            <SectionLabel text="Población" />
            <Field
              label="Densidad poblacional ρ (hab/km²)"
              value={params.rho}
              onChange={v => setParams({ ...params, rho: v })}
              hint="Habitantes por kilómetro cuadrado"
            />
            <Field
              label="Tasa vehicular β (veh/hab)"
              value={params.beta}
              onChange={v => setParams({ ...params, beta: v })}
              hint="Vehículos por habitante (0.1 – 2.0)"
              step={0.05}
            />

            <div className="sim-divider" />
            <SectionLabel text="Economía" />
            <Field
              label="Multa base k ($)"
              value={params.k}
              onChange={v => setParams({ ...params, k: v })}
              hint="Costo base por infracción"
            />
            <Field
              label="Multa objetivo L ($)"
              value={params.L}
              onChange={v => setParams({ ...params, L: v })}
              hint="Debe ser mayor que k"
            />

            <div className="sim-divider" />
            <SectionLabel text="Modelo" />
            <Field
              label="Sensibilidad al riesgo α"
              value={params.alpha}
              onChange={v => setParams({ ...params, alpha: v })}
              hint="Factor de ajuste del modelo"
            />

            {/* Advertencia si L <= k */}
            {params.L <= params.k && (
              <div className="sim-warn">
                ⚠ La multa objetivo L debe ser mayor que la multa base k.
              </div>
            )}

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
                      ? `Equilibrio hallado · σ* ≈ ${result.root.toFixed(4)}`
                      : `Sin convergencia tras ${result.totalIter} iteraciones`}
                  </span>
                </div>

                {/* Gráfico */}
                <div className="sim-graph">
                  <div className="sim-graph-title">
                    f(σ) = k + α·(ρ·β/σ) − L
                  </div>
                  <ResponsiveContainer width="100%" height={175}>
                    <LineChart data={graphPoints} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
                      <XAxis dataKey="x" tick={{ fontSize: 9, fill: "var(--muted)", fontFamily: "'DM Mono', monospace" }} />
                      <YAxis tick={{ fontSize: 9, fill: "var(--muted)", fontFamily: "'DM Mono', monospace" }} />
                      <Tooltip
                        contentStyle={{ fontSize: 10, borderRadius: 8, fontFamily: "'DM Mono', monospace", border: `1px solid var(--border)`, background: "var(--surface)" }}
                        labelFormatter={(v) => `σ = ${v}`}
                        formatter={(v) => [`f(σ) = ${v}`, ""]}
                      />
                      <ReferenceLine y={0} stroke="var(--muted)" strokeWidth={1} />
                      <ReferenceLine
                        x={parseFloat(result.root.toFixed(3))}
                        stroke="#6CBDB5"
                        strokeDasharray="5 3"
                        strokeWidth={1.5}
                        label={{ value: `σ*=${result.root.toFixed(2)}`, position: "top", fontSize: 9, fill: "#6CBDB5" }}
                      />
                      <Line type="monotone" dataKey="y" stroke="#6CBDB5" strokeWidth={2} dot={false} connectNulls={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Tabla de Iteraciones con scroll */}
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
                          {["n", "σₙ", "f(σₙ)", "f′(σₙ)", "Error %"].map(h => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayedIter.map((row, i) => (
                          <tr key={i} style={{ background: row.converged ? "rgba(108,189,181,0.07)" : "transparent" }}>
                            <td>{row.n}</td>
                            <td>{row.sigma}</td>
                            <td>{row.fs}</td>
                            <td>{row.fpx}</td>
                            <td style={{ color: row.converged ? "var(--teal)" : "var(--text)", fontWeight: row.converged ? 500 : 400 }}>
                              {row.error === "0.0000" ? "—" : `${row.error}%`}
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
                    Interpretación del Resultado
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.8 }}>
                    Para una zona con <strong>{params.rho} hab/km²</strong> y tasa
                    vehicular <strong>β = {params.beta}</strong>, el modelo
                    converge en <strong>{result.totalIter} iteraciones</strong> a
                    una densidad óptima de infraestructura de{" "}
                    <strong style={{ color: "var(--teal)" }}>σ* = {result.root.toFixed(4)}</strong> dispositivos/km²,
                    punto en el que el costo operativo se equilibra con la multa objetivo de{" "}
                    <strong>${params.L}</strong>.
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