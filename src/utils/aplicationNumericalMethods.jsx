import React, { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";

// ─── Paleta de Colores NumérikaAI ───────────────────────────────────────────
const C = {
  cream: "#E3DFBA", sage: "#C8D6BF", teal: "#6CBDB5", 
  dark: "#1A1F1E", bg: "#f5f3e8", surface: "#faf9f2", 
  border: "#dddbc8", muted: "#7a8a82", text: "#1A1F1E",
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function SimuladorMultas() {
  // 1. ESTADOS DE PARÁMETROS
  const [params, setParams] = useState({
    rho: 5000,   // Población
    beta: 0.5,   // Tasa vehicular
    k: 1000,     // Multa base
    L: 4500,     // Multa objetivo
    alpha: 100   // Sensibilidad
  });

  const [result, setResult] = useState(null);

  // 2. MOTOR DE CÁLCULO (Newton-Raphson)
  const calcularEquilibrio = () => {
    const { rho, beta, k, L, alpha } = params;
    
    // Función: f(sigma) = k + alpha * (rho * beta / sigma) - L
    const f = (s) => k + (alpha * (rho * beta) / s) - L;
    const fDerivada = (s) => -(alpha * (rho * beta)) / Math.pow(s, 2);

    let sigma_n = 5.0; // Semilla inicial sugerida
    const tol = 0.0001;
    let iterations = [];
    let converged = false;

    for (let i = 0; i < 25; i++) {
      let y = f(sigma_n);
      let d = fDerivada(sigma_n);
      
      if (Math.abs(d) < 1e-10) break;

      let next_sigma = sigma_n - (y / d);
      let error = Math.abs((next_sigma - sigma_n) / next_sigma) * 100;

      iterations.push({
        n: i + 1,
        sigma: sigma_n.toFixed(4),
        fs: y.toFixed(4),
        error: error.toFixed(4)
      });

      if (error < tol) {
        converged = true;
        sigma_n = next_sigma;
        break;
      }
      sigma_n = next_sigma;
    }

    setResult({
      root: sigma_n,
      iterations: iterations,
      converged: converged,
      totalIter: iterations.length
    });
  };

  // Recalcular automáticamente
  useEffect(() => {
    if (params.L > params.k && params.rho > 0) {
      calcularEquilibrio();
    }
  }, [params]);

  // 3. GENERACIÓN DE PUNTOS PARA EL GRÁFICO
  const graphPoints = useMemo(() => {
    let points = [];
    if (!result) return points;
    
    const root = result.root;
    const start = Math.max(1, root - 50);
    const end = root + 50;

    for (let s = start; s <= end; s += (end - start) / 40) {
      const val = params.k + (params.alpha * (params.rho * params.beta) / s) - params.L;
      points.push({ x: parseFloat(s.toFixed(2)), y: parseFloat(val.toFixed(2)) });
    }
    return points;
  }, [params, result]);

  return (
    <div style={{ fontFamily: "'DM Mono', monospace", color: C.text }}>
      
      {/* Grid de dos columnas estilo Solver */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>

      {/* ── Futura Descripción del método ── */}  
                    {/* ... */}

        {/* ── PANEL DE CONFIGURACIÓN (Izquierda) ── */}
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <span style={labelStyle}>Variables Urbanas</span>
            <span style={tagStyle}>Modelo 1.0</span>
          </div>
          <div className="field" style={{ padding: 20 }}>
            <Field label="Población (hab/km²)" value={params.rho} onChange={v => setParams({...params, rho: v})} />
            <Field label="Tasa Vehicular (β)" value={params.beta} onChange={v => setParams({...params, beta: v})} />
            <Field label="Multa Objetivo (L)" value={params.L} onChange={v => setParams({...params, L: v})} />
            
            <div style={{ borderTop: `1px solid ${C.border}`, margin: "18px 0" }} />
            
            <p style={{ fontSize: 10, color: C.muted, lineHeight: 1.5 }}>
              * El simulador ajusta la <strong>densidad de infraestructura</strong> para equilibrar el costo operativo (L).
            </p>
          </div>
        </div>

        {/* ── PANEL DE RESULTADOS (Derecha) ── */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Resultado</span>
            {result && <span style={{ fontSize: 9 }}>{result.totalIter} iteraciones</span>}
          </div>
          <div style={{ padding: 20 }}>
            {result ? (
              <>
                {/* Status Bar */}
                <div style={{ ...statusBar, background: result.converged ? "rgba(108,189,181,0.1)" : "rgba(220,180,100,0.1)" }}>
                   <span style={{ color: result.converged ? C.teal : "#d4a84b" }}>
                    {result.converged ? `✓ Punto de equilibrio hallado en σ ≈ ${result.root.toFixed(4)}` : "Buscando convergencia..."}
                   </span>
                </div>

                {/* Gráfico de Recharts */}
                <div style={graphContainer}>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={graphPoints}>
                      <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                      <XAxis dataKey="x" tick={{ fontSize: 9 }} label={{ value: 'σ', position: 'insideBottomRight', offset: -5 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                      <ReferenceLine y={0} stroke={C.muted} />
                      <ReferenceLine x={result.root} stroke={C.teal} strokeDasharray="3 3" />
                      <Line type="monotone" dataKey="y" stroke={C.teal} dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Tabla de Iteraciones resumida */}
                <div className="table-wrap" style={{ overflowX: "auto", marginTop: 24 }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>n</th>
                        <th style={thStyle}>Sigma (σ)</th>
                        <th style={thStyle}>f(σ)</th>
                        <th style={thStyle}>Error %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.iterations.slice(-5).map((it, i) => (
                        <tr key={i}>
                          <td style={tdStyle}>{it.n}</td>
                          <td style={tdStyle}>{it.sigma}</td>
                          <td style={tdStyle}>{it.fs}</td>
                          <td style={{ ...tdStyle, color: C.teal, fontWeight: "500" }}>
                      {it.error === "0.0000" ? "—" : `${it.error}%`}
                      </td>
                      </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* AI Insight */}
                <div style={aiBoxStyle}>
                  <div style={aiLabelStyle}>Insight de Ingeniería</div>
                  <p style={{ margin: 0 }}>
                    Para optimizar la seguridad en una zona de <strong>{params.rho} hab/km²</strong>, el sistema sugiere una densidad de <strong>{result.root.toFixed(2)}</strong> dispositivos por unidad de área para estabilizar el impacto económico objetivo.
                  </p>
                </div>
              </>
            ) : (
              <p style={{ textAlign: "center", color: C.muted }}>Calculando modelo...</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Estilos y Helpers (Consistentes con Solver) ──────────────────────────────
const panelStyle = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" };
const panelHeaderStyle = { padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" };
const labelStyle = { fontSize: 9, letterSpacing: "2.5px", textTransform: "uppercase", color: C.muted };
const tagStyle = { fontSize: 9, letterSpacing: "1px", textTransform: "uppercase", padding: "3px 10px", borderRadius: 20, color: "#6a8a6a", background: "rgba(200,214,191,0.15)" };
const statusBar = { padding: "10px 15px", borderRadius: 8, marginBottom: 16, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 };
const graphContainer = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "15px 10px 5px" };
const tableStyle = {
  width: "100%",
  borderCollapse: "collapse", // Crucial para que las líneas se vean bien
  fontSize: "11px",
  fontFamily: "'DM Mono', monospace",
};

const thStyle = {
  fontSize: "9px",
  letterSpacing: "1.5px",
  textTransform: "uppercase",
  color: C.muted,
  textAlign: "left",
  padding: "12px 10px", // Más aire arriba y abajo
  borderBottom: `1px solid ${C.border}`, // Línea divisoria del header
  fontWeight: "500",
};

const tdStyle = {
  padding: "14px 10px", // Espaciado generoso para que sea "entendible"
  borderBottom: `1px solid rgba(221, 219, 200, 0.5)`, // Línea sutil entre filas
  color: C.text,
};
const aiBoxStyle = { padding: "14px 16px", background: "rgba(200,214,191,0.15)", border: "1px solid rgba(200,214,191,0.4)", borderRadius: 8, marginTop: 16, fontSize: 11, color: C.muted, lineHeight: 1.6 };
const aiLabelStyle = { fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "#6a8a6a", marginBottom: 6 };

function Field({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 15 }}>
      <label style={{ display: "block", fontSize: 9, textTransform: "uppercase", color: "#7a8a82", marginBottom: 5 }}>{label}</label>
      <input
        type="number"
        style={{ width: "100%", background: "#f5f3e8", border: "1px solid #dddbc8", borderRadius: 8, padding: "8px 12px", fontFamily: "'DM Mono', monospace", fontSize: 13, outline: "none" }}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  );
}