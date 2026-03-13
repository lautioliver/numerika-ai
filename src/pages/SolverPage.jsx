import { useState, useMemo, useEffect } from "react";
import { InteractiveChart } from "../components/InteractiveChart";
import { GuideAccordion } from "../components/GuideAccordion";
import { Field } from "../components/Field";
import {
  parseFunction,
  biseccion,
  reglaFalsa,
  newtonRaphson,  
  secante,
  puntoFijo,
  getPoints,
} from "../utils/numericalMethods";

// ─── Paleta ───────────────────────────────────────────────────────────────────
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

const METHODS = [
  {
    id: "biseccion",
    name: "Bisección",
    type: "cerrado",
    desc: "Divide [a,b] a la mitad. Convergencia garantizada si f(a)·f(b) < 0.",
    inputs: ["fx", "ab", "tol"],
    cols: ["n", "a", "b", "c", "fc", "err"],
    labels: { n: "n", a: "a", b: "b", c: "c", fc: "f(c)", err: "Error %" },
    run: (v) => biseccion(v.fx, v.a, v.b, parseFloat(v.tol) || 1e-4),
  },
  {
    id: "reglafalsa",
    name: "Regla Falsa",
    type: "cerrado",
    desc: "Interpolación lineal entre a y b. Más veloz en funciones suaves.",
    inputs: ["fx", "ab", "tol"],
    cols: ["n", "a", "b", "c", "fc", "err"],
    labels: { n: "n", a: "a", b: "b", c: "c", fc: "f(c)", err: "Error %" },
    run: (v) => reglaFalsa(v.fx, v.a, v.b, parseFloat(v.tol) || 1e-4),
  },
  {
    id: "newton",
    name: "Newton-Raphson",
    type: "abierto",
    desc: "Usa f′(x) numérica. Convergencia cuadrática — muy rápido cerca de la raíz.",
    inputs: ["fx", "x0", "tol"],
    cols: ["n", "x", "fx", "fpx", "x1", "err"],
    labels: { n: "n", x: "xₙ", fx: "f(xₙ)", fpx: "f′(xₙ)", x1: "xₙ₊₁", err: "Error %" },
    run: (v) => newtonRaphson(v.fx, v.x0, parseFloat(v.tol) || 1e-4),
  },
  {
    id: "secante",
    name: "Secante",
    type: "abierto",
    desc: "Aproxima f′(x) con dos puntos. No requiere derivada analítica.",
    inputs: ["fx", "x0", "x1sec", "tol"],
    cols: ["n", "x0", "x1", "x2", "fx2", "err"],
    labels: { n: "n", x0: "x₀", x1: "x₁", x2: "x₂", fx2: "f(x₂)", err: "Error %" },
    run: (v) => secante(v.fx, v.x0, v.x1sec, parseFloat(v.tol) || 1e-4),
  },
  {
    id: "puntofijo",
    name: "Punto Fijo",
    type: "abierto",
    desc: "Itera x = g(x). Converge si |g′(x)| < 1 en el entorno de la raíz.",
    inputs: ["gx", "x0", "tol"],
    cols: ["n", "x", "gx", "err"],
    labels: { n: "n", x: "xₙ", gx: "g(xₙ)", err: "Error %" },
    run: (v) => puntoFijo(v.gx, v.x0, parseFloat(v.tol) || 1e-4),
  },
];

// ─── App ──────────────────────────────────────────────────────────────────────
export const SolverPage = ({ activeMethod, setActiveMethod, calculated, onCalculate, funcExpr, onFuncChange }) => {
  const [mid, setMid] = useState(activeMethod);
  const [vals, setVals] = useState({
    fx: funcExpr || "x^2 - x - 2", // Usar prop como inicial
    a: "1",
    b: "3",
    x0: "1.5",
    x1sec: "2.5",
    gx: "sqrt(x + 2)",
    tol: "0.0001",
  });
  const [result, setResult] = useState(null);
  const [calcErr, setCalcErr] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Ocultar resultados cuando calculated cambia a false
  useEffect(() => {
    if (!calculated) {
      setResult(null);
      setCalcErr(null);
    }
  }, [calculated]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const method = METHODS.find((m) => m.id === mid);
  const set = (k, v) => {
    setVals((p) => ({ ...p, [k]: v }));
    // Cuando cambias fx, notifica al padre Y oculta resultados
    if (k === "fx" && onFuncChange) {
      onFuncChange(v);
    }
  };

  const run = () => {
    setCalcErr(null);
    setResult(null);
    const r = method.run(vals);
    
    // Si hay error pero también iteraciones, mostrar ambas
    if (r.error) {
      // Si solo hay error sin iteraciones, mostrar como error
      if (!r.iterations || r.iterations.length === 0) {
        setCalcErr(r.error);
        return;
      }
      // Si hay iteraciones parciales, mostrar resultado con advertencia como error
      setCalcErr(r.error);
      setResult(r);
    } else {
      setResult(r);
    }
    
    if (onCalculate) onCalculate();
  };

  const graphExpr = mid === "puntofijo" ? vals.gx : vals.fx;
  const points = useMemo(() => {
    let xMin = -4,
        xMax = 6;
    if (method.type === "cerrado") {
      const a = parseFloat(vals.a),
        b = parseFloat(vals.b);
      if (!isNaN(a) && !isNaN(b)) {
        xMin = a - Math.abs(b - a) * 0.6;
        xMax = b + Math.abs(b - a) * 0.6;
      }
    } else {
      const x0 = parseFloat(vals.x0);
      if (!isNaN(x0)) {
        xMin = x0 - 4;
        xMax = x0 + 5;
      }
    }
    return getPoints(graphExpr, xMin, xMax);
  }, [graphExpr, vals.a, vals.b, vals.x0, mid]);

  return (
    <div style={{ fontFamily: "'DM Mono',monospace", color: C.dark, background: C.bg, minHeight: "100vh", padding: isMobile ? "20px 16px" : "32px 24px", maxWidth: "1200px", margin: "0 auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap');`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: "3px", textTransform: "uppercase", color: C.muted, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "inline-block", width: 18, height: 1, background: C.teal }} />
          Solver
        </div>
        <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: isMobile ? 20 : 26, fontWeight: 400, color: C.dark, margin: 0 }}>
          Calculá <em style={{ color: C.teal, fontStyle: "italic" }}>paso a paso</em>
        </h2>
      </div>

      {/* Method tabs */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 18 }}>
        {METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              setMid(m.id);
              setResult(null);
              setCalcErr(null);
            }}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              cursor: "pointer",
              border: `1px solid ${mid === m.id ? C.teal : C.border}`,
              background: mid === m.id ? "rgba(108,189,181,0.1)" : C.surface,
              color: mid === m.id ? C.teal : C.muted,
              fontFamily: "'DM Mono',monospace",
              fontSize: 11,
              lineHeight: 1.4,
              textAlign: "left",
            }}
          >
            <div>{m.name}</div>
            <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", opacity: 0.7 }}>{m.type}</div>
          </button>
        ))}
      </div>

      <div
        style={{
          fontSize: 11,
          color: C.muted,
          lineHeight: 1.7,
          padding: "10px 14px",
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderLeft: `3px solid ${C.teal}`,
          borderRadius: 8,
          marginBottom: 22,
        }}
      >
        {method.desc}
      </div>

      {/* Grid — config | results */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "250px 1fr", gap: 16, alignItems: "start" }}>
        {/* Config */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "13px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 9, letterSpacing: "2.5px", textTransform: "uppercase", color: C.muted }}>Configuración</span>
            <span
              style={{
                fontSize: 9,
                padding: "3px 9px",
                borderRadius: 20,
                color: method.type === "cerrado" ? C.teal : "#6a8a6a",
                background: method.type === "cerrado" ? "rgba(108,189,181,0.1)" : "rgba(200,214,191,0.15)",
                border: `1px solid ${method.type === "cerrado" ? "rgba(108,189,181,0.3)" : "rgba(200,214,191,0.4)"}`,
              }}
            >
              {method.type}
            </span>
          </div>
          <div style={{ padding: 18 }}>
            {method.inputs.includes("fx") && <Field label="f(x)" value={vals.fx} onChange={(v) => set("fx", v)} placeholder="x^2 - x - 2" hint="^ potencia · * multiplicar" />}
            {method.inputs.includes("gx") && <Field label="g(x)" value={vals.gx} onChange={(v) => set("gx", v)} placeholder="sqrt(x + 2)" hint="Despejá x = g(x)" />}
            {method.inputs.includes("ab") && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: C.muted, marginBottom: 6 }}>Intervalo [a, b]</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input
                    value={vals.a}
                    onChange={(e) => set("a", e.target.value)}
                    placeholder="a"
                    style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontFamily: "'DM Mono',monospace", fontSize: 13, color: C.dark, outline: "none", width: "100%", boxSizing: "border-box" }}
                  />
                  <input
                    value={vals.b}
                    onChange={(e) => set("b", e.target.value)}
                    placeholder="b"
                    style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontFamily: "'DM Mono',monospace", fontSize: 13, color: C.dark, outline: "none", width: "100%", boxSizing: "border-box" }}
                  />
                </div>
              </div>
            )}
            {method.inputs.includes("x0") && <Field label="Punto inicial x₀" value={vals.x0} onChange={(v) => set("x0", v)} placeholder="1.5" />}
            {method.inputs.includes("x1sec") && <Field label="Segundo punto x₁" value={vals.x1sec} onChange={(v) => set("x1sec", v)} placeholder="2.5" />}
            <Field label="Tolerancia" value={vals.tol} onChange={(v) => set("tol", v)} placeholder="0.0001" hint="0.001 → error < 0.1%" />

            {calcErr && (
              <div style={{ padding: "10px 12px", background: "rgba(200,80,60,0.08)", border: "1px solid rgba(200,80,60,0.2)", borderRadius: 8, marginBottom: 14, fontSize: 11, color: "#b05040", lineHeight: 1.6 }}>
                {calcErr}
              </div>
            )}
            <div style={{ borderTop: `1px solid ${C.border}`, margin: "16px 0" }} />
            <button
              onClick={run}
              style={{ width: "100%", background: C.dark, color: C.cream, border: "none", borderRadius: 8, padding: 12, fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", cursor: "pointer" }}
            >
              Calcular
            </button>
          </div>
        </div>

        {/* Results */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "13px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 9, letterSpacing: "2.5px", textTransform: "uppercase", color: C.muted }}>Resultado</span>
            {result && <span style={{ fontSize: 9, color: C.muted, letterSpacing: "1px" }}>{result.totalIter} iteraciones</span>}
          </div>
          <div style={{ padding: 18 }}>
            {!result && !calcErr && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 260, color: C.muted, gap: 10 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                <p style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", margin: 0 }}>Configurá y calculá</p>
              </div>
            )}

            {result && (
              <>
                {/* Status */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 8,
                    marginBottom: 18,
                    background: result.converged ? "rgba(108,189,181,0.1)" : "rgba(212,168,75,0.1)",
                    border: `1px solid ${result.converged ? "rgba(108,189,181,0.3)" : "rgba(212,168,75,0.3)"}`,
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: result.converged ? C.teal : "#d4a84b" }} />
                  <span style={{ fontSize: 10, letterSpacing: "1.5px", textTransform: "uppercase", color: result.converged ? C.teal : "#d4a84b" }}>
                    {result.converged ? `Convergencia · raíz ≈ ${result.root}` : `Sin convergencia tras ${result.totalIter} iter.`}
                  </span>
                </div>

                {/* Interactive chart */}
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 14px 10px", marginBottom: 18 }}>
                  <InteractiveChart points={points} root={result.root} fnLabel={mid === "puntofijo" ? `g(x) = ${vals.gx}` : `f(x) = ${vals.fx}`} />
                </div>

                {/* Table */}
                <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: C.bg }}>
                        {method.cols.map((col) => (
                          <th key={col} style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: C.muted, textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                            {method.labels[col]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.iterations.map((row, i) => (
                        <tr key={i} style={{ background: row.converged ? "rgba(108,189,181,0.07)" : "transparent" }}>
                          {method.cols.map((col) => (
                            <td key={col} style={{ padding: "7px 10px", borderBottom: `1px solid ${C.border}`, color: row.converged && col === "err" ? C.teal : C.dark, fontFamily: "'DM Mono',monospace" }}>
                              {row[col] === null || row[col] === undefined ? "—" : col === "err" && row[col] !== null ? `${row[col]}%` : row[col]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* AI placeholder */}
                <div style={{ padding: "12px 14px", background: "rgba(200,214,191,0.15)", border: "1px solid rgba(200,214,191,0.4)", borderRadius: 8, marginTop: 16 }}>
                  <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "#6a8a6a", marginBottom: 5, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.sage, display: "inline-block" }} />
                    Explicación IA · próximamente
                  </div>
                  <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.8, fontStyle: "italic", margin: 0 }}>
                    Aquí aparecerá la explicación generada por IA sobre la convergencia del método y el comportamiento de cada iteración.
                  </p>
                </div>
              </>
            )}

            {/* Guide accordion — siempre visible abajo */}
            <GuideAccordion methodId={mid} values={vals} />
          </div>
        </div>
      </div>
    </div>
  );
}
