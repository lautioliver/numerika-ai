import { useState, useMemo } from "react";
import {
  biseccion, reglaFalsa, newtonRaphson, secante, puntoFijo,
  getFunctionPoints,
} from "../utils/numericalMethods";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";

// ─── Paleta ───────────────────────────────────────────────────────────────────
const C = {
  cream: "#E3DFBA", sage: "#C8D6BF", tealLt: "#93CCC6",
  teal: "#6CBDB5", dark: "#1A1F1E",
  bg: "#f5f3e8", surface: "#faf9f2", border: "#dddbc8",
  muted: "#7a8a82", text: "#1A1F1E",
};

// ─── Métodos config ───────────────────────────────────────────────────────────
const METHODS = [
  {
    id: "biseccion", name: "Bisección", type: "cerrado",
    desc: "Divide [a,b] a la mitad en cada paso. Converge siempre si f(a)·f(b) < 0.",
    inputs: ["fx", "a", "b", "tol"],
    columns: ["n", "a", "b", "c", "fc", "err"],
    labels:  { n:"n", a:"a", b:"b", c:"c", fc:"f(c)", err:"Error %" },
    run: (v) => biseccion(v.fx, v.a, v.b, parseFloat(v.tol) || 1e-6),
  },
  {
    id: "reglafalsa", name: "Regla Falsa", type: "cerrado",
    desc: "Interpolación lineal entre a y b. Más rápido que bisección en funciones suaves.",
    inputs: ["fx", "a", "b", "tol"],
    columns: ["n", "a", "b", "c", "fc", "err"],
    labels:  { n:"n", a:"a", b:"b", c:"c", fc:"f(c)", err:"Error %" },
    run: (v) => reglaFalsa(v.fx, v.a, v.b, parseFloat(v.tol) || 1e-6),
  },
  {
    id: "newton", name: "Newton-Raphson", type: "abierto",
    desc: "Usa f'(x) numérica para convergencia cuadrática. Muy rápido cerca de la raíz.",
    inputs: ["fx", "x0", "tol"],
    columns: ["n", "x", "fx", "fpx", "x1", "err"],
    labels:  { n:"n", x:"xₙ", fx:"f(xₙ)", fpx:"f′(xₙ)", x1:"xₙ₊₁", err:"Error %" },
    run: (v) => newtonRaphson(v.fx, v.x0, parseFloat(v.tol) || 1e-6),
  },
  {
    id: "secante", name: "Secante", type: "abierto",
    desc: "Aproxima f'(x) con dos puntos. No necesita derivada analítica.",
    inputs: ["fx", "x0", "x1", "tol"],
    columns: ["n", "x0", "x1", "x2", "fx2", "err"],
    labels:  { n:"n", x0:"x₀", x1:"x₁", x2:"x₂", fx2:"f(x₂)", err:"Error %" },
    run: (v) => secante(v.fx, v.x0, v.x1, parseFloat(v.tol) || 1e-6),
  },
  {
    id: "puntofijo", name: "Punto Fijo", type: "abierto",
    desc: "Itera x = g(x). Converge si |g′(x)| < 1 en el entorno de la raíz.",
    inputs: ["gx", "x0", "tol"],
    columns: ["n", "x", "gx", "err"],
    labels:  { n:"n", x:"xₙ", gx:"g(xₙ)", err:"Error %" },
    run: (v) => puntoFijo(v.gx, v.x0, parseFloat(v.tol) || 1e-6),
  },
];

// ─── Tooltip custom para el gráfico ──────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { x, y } = payload[0].payload;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
      <span style={{ color: C.muted }}>x = {x}  </span>
      <span style={{ color: C.teal }}>f(x) = {y}</span>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Solver() {
  const [methodId, setMethodId] = useState("biseccion");
  const [values, setValues] = useState({ fx: "x^2 - x - 2", a: "1", b: "3", x0: "1.5", x1: "2.5", gx: "sqrt(x + 2)", tol: "0.0001" });
  const [result, setResult] = useState(null);
  const [calcError, setCalcError] = useState(null);

  const method = METHODS.find(m => m.id === methodId);

  const set = (k, v) => setValues(prev => ({ ...prev, [k]: v }));

  const handleRun = () => {
    if (!values.fx || values.fx.trim() === "") {
      setCalcError("Ingresá una función f(x) para continuar.");
      return;
    }
    setCalcError(null);
    setResult(null);
    const res = method.run(values);
    if (res.error) { setCalcError(res.error); return; }
    setResult(res);
  };

  // Puntos para la gráfica
  const graphPoints = useMemo(() => {
    const expr = method.id === "puntofijo" ? values.gx : values.fx;
    let xMin = -5, xMax = 5;
    if (method.type === "cerrado") {
      const a = parseFloat(values.a), b = parseFloat(values.b);
      if (!isNaN(a) && !isNaN(b)) { xMin = a - Math.abs(b - a); xMax = b + Math.abs(b - a); }
    } else {
      const x0 = parseFloat(values.x0);
      if (!isNaN(x0)) { xMin = x0 - 4; xMax = x0 + 4; }
    }
    return getFunctionPoints(expr, xMin, xMax);
  }, [values.fx, values.gx, values.a, values.b, values.x0, method.id]);

  const root = result?.root;

  return (
    <div style={{ fontFamily: "'DM Mono', monospace", color: C.text }}>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, letterSpacing: "3px", textTransform: "uppercase", color: C.muted, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-block", width: 20, height: 1, background: C.teal }} />
          Solver
        </div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, fontWeight: 400, color: C.dark }}>
          Calculá paso a paso
        </h2>
      </div>

      {/* Method selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {METHODS.map(m => (
          <button key={m.id} onClick={() => { setMethodId(m.id); setResult(null); setCalcError(null); }}
            style={{
              padding: "8px 16px", borderRadius: 8, cursor: "pointer", transition: "all 0.2s",
              fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "1px",
              border: methodId === m.id ? `1px solid ${C.teal}` : `1px solid ${C.border}`,
              background: methodId === m.id ? `rgba(108,189,181,0.12)` : C.surface,
              color: methodId === m.id ? C.teal : C.muted,
            }}>
            <span style={{ display: "block", marginBottom: 1 }}>{m.name}</span>
            <span style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", opacity: 0.7 }}>{m.type}</span>
          </button>
        ))}
      </div>

      {/* Description */}
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 28, lineHeight: 1.7, padding: "10px 16px", background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.teal}`, borderRadius: 8 }}>
        {method.desc}
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>

        {/* ── CONFIG PANEL ── */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 9, letterSpacing: "2.5px", textTransform: "uppercase", color: C.muted }}>Configuración</span>
            <span style={{
              fontSize: 9, letterSpacing: "1px", textTransform: "uppercase", padding: "3px 10px", borderRadius: 20,
              color: method.type === "cerrado" ? C.teal : "#6a8a6a",
              background: method.type === "cerrado" ? "rgba(108,189,181,0.1)" : "rgba(200,214,191,0.15)",
              border: `1px solid ${method.type === "cerrado" ? "rgba(108,189,181,0.3)" : "rgba(200,214,191,0.4)"}`,
            }}>{method.type}</span>
          </div>
          <div style={{ padding: 20 }}>

            {/* f(x) */}
            {method.inputs.includes("fx") && (
              <Field label="Función f(x)" value={values.fx} onChange={v => set("fx", v)} placeholder="x^2 - x - 2" hint="Usá ^ para potencia, * para multiplicar" />
            )}
            {/* g(x) para punto fijo */}
            {method.inputs.includes("gx") && (
              <Field label="Función g(x)" value={values.gx} onChange={v => set("gx", v)} placeholder="sqrt(x + 2)" hint="Despejá x = g(x) de f(x) = 0" />
            )}

            {/* Intervalo */}
            {method.inputs.includes("a") && (
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Intervalo [a, b]</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input style={inputStyle} value={values.a} onChange={e => set("a", e.target.value)} placeholder="a" />
                  <input style={inputStyle} value={values.b} onChange={e => set("b", e.target.value)} placeholder="b" />
                </div>
              </div>
            )}

            {/* x0 */}
            {method.inputs.includes("x0") && (
              <Field label={method.id === "secante" ? "Punto inicial x₀" : "Punto inicial x₀"} value={values.x0} onChange={v => set("x0", v)} placeholder="1.5" />
            )}
            {/* x1 para secante */}
            {method.inputs.includes("x1") && (
              <Field label="Segundo punto x₁" value={values.x1} onChange={v => set("x1", v)} placeholder="2.5" />
            )}

            {/* Tolerancia */}
            <Field label="Tolerancia" value={values.tol} onChange={v => set("tol", v)} placeholder="0.0001" hint="Ej: 0.001 → error < 0.1%" />

            {/* Error */}
            {calcError && (
              <div style={{ padding: "10px 14px", background: "rgba(220,100,80,0.08)", border: "1px solid rgba(220,100,80,0.25)", borderRadius: 8, marginBottom: 16, fontSize: 11, color: "#c06050", lineHeight: 1.6 }}>
                {calcError}
              </div>
            )}

            <div style={{ borderTop: `1px solid ${C.border}`, margin: "18px 0" }} />
            <button onClick={handleRun} style={{
              width: "100%", background: C.dark, color: C.cream, border: "none",
              borderRadius: 8, padding: 13, fontFamily: "'DM Mono', monospace",
              fontSize: 10, letterSpacing: "2px", textTransform: "uppercase",
              cursor: "pointer", transition: "opacity 0.2s",
            }}
              onMouseEnter={e => e.target.style.opacity = "0.82"}
              onMouseLeave={e => e.target.style.opacity = "1"}
            >
              Calcular
            </button>
          </div>
        </div>

        {/* ── RESULT PANEL ── */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 9, letterSpacing: "2.5px", textTransform: "uppercase", color: C.muted }}>Resultado</span>
            {result && (
              <span style={{ fontSize: 9, letterSpacing: "1px", color: C.muted }}>
                {result.totalIter} iteraciones
              </span>
            )}
          </div>
          <div style={{ padding: 20 }}>
            {!result && !calcError && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, color: C.muted, gap: 12 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
                <p style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase" }}>Configurá y calculá</p>
              </div>
            )}

            {result && (
              <>
                {/* Status */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "9px 13px",
                  borderRadius: 8, marginBottom: 16,
                  background: result.converged ? "rgba(108,189,181,0.1)" : "rgba(220,180,100,0.1)",
                  border: `1px solid ${result.converged ? "rgba(108,189,181,0.3)" : "rgba(220,180,100,0.3)"}`,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: result.converged ? C.teal : "#d4a84b" }} />
                  <span style={{ fontSize: 10, letterSpacing: "1.5px", textTransform: "uppercase", color: result.converged ? C.teal : "#d4a84b" }}>
                    {result.converged ? `Convergencia · raíz ≈ ${result.root}` : `Sin convergencia tras ${result.totalIter} iteraciones`}
                  </span>
                </div>

                {/* Graph */}
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 18, padding: "14px 4px 4px" }}>
                  <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: C.muted, paddingLeft: 14, marginBottom: 6 }}>
                    {method.id === "puntofijo" ? `g(x) = ${values.gx}` : `f(x) = ${values.fx}`}
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={graphPoints} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke={C.border} strokeDasharray="4 4" />
                      <XAxis dataKey="x" tick={{ fontSize: 9, fill: C.muted, fontFamily: "'DM Mono', monospace" }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9, fill: C.muted, fontFamily: "'DM Mono', monospace" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={0} stroke={C.muted} strokeWidth={1} />
                      {root && <ReferenceLine x={parseFloat(root.toFixed(4))} stroke={C.teal} strokeDasharray="5 3" strokeWidth={1.5} />}
                      <Line type="monotone" dataKey="y" stroke={C.teal} strokeWidth={1.8} dot={false} connectNulls={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Iteration table */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr>
                        {method.columns.map(col => (
                          <th key={col} style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: C.muted, textAlign: "left", padding: "7px 10px", borderBottom: `1px solid ${C.border}` }}>
                            {method.labels[col]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.iterations.map((row, i) => (
                        <tr key={i} style={{ background: row.converged ? "rgba(108,189,181,0.07)" : "transparent" }}>
                          {method.columns.map(col => (
                            <td key={col} style={{ padding: "7px 10px", borderBottom: `1px solid ${C.border}`, color: col === "err" && row.converged ? C.teal : C.text, fontWeight: row.converged && col === "err" ? 500 : 400 }}>
                              {row[col] === null ? "—" : row[col] === undefined ? "—" : col === "err" && row[col] !== null ? `${row[col]}%` : row[col]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* AI insight placeholder */}
                <div style={{ padding: "14px 16px", background: "rgba(200,214,191,0.15)", border: "1px solid rgba(200,214,191,0.4)", borderRadius: 8, marginTop: 16 }}>
                  <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "#6a8a6a", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.sage, display: "inline-block" }} />
                    Explicación IA
                  </div>
                  <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.8, fontStyle: "italic" }}>
                    El módulo de IA se integrará en la siguiente versión. Aquí aparecerá una explicación detallada de la convergencia, el comportamiento del método y sugerencias de mejora.
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
const labelStyle = {
  display: "block", fontSize: 9, letterSpacing: "2px",
  textTransform: "uppercase", color: "#7a8a82", marginBottom: 7,
};

const inputStyle = {
  width: "100%", background: "#f5f3e8", border: "1px solid #dddbc8",
  borderRadius: 8, padding: "10px 13px",
  fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#1A1F1E",
  outline: "none", boxSizing: "border-box",
};

function Field({ label, value, onChange, placeholder, hint }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={labelStyle}>{label}</label>
      <input
        style={{ ...inputStyle, borderColor: focused ? "#6CBDB5" : "#dddbc8", transition: "border-color 0.2s" }}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {hint && <div style={{ fontSize: 9, color: "#7a8a82", marginTop: 4, letterSpacing: "0.5px" }}>{hint}</div>}
    </div>
  );
}
