import React, { useState, useMemo } from "react";
import { METHODS } from "../constants/data";
import { MethodTypeTag } from "../components/MethodTypeTag";
import {
  biseccion,
  reglaFalsa,
  newtonRaphson,
  secante,
  puntoFijo,
  getFunctionPoints,
  detectMultipleRoots,
} from "../utils/numericalMethods";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

// ─── Tooltip del gráfico ──────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { x, y } = payload[0].payload;
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 6,
      padding: "6px 12px",
      fontSize: 11,
      fontFamily: "'DM Mono', monospace",
    }}>
      <span style={{ color: "var(--muted)" }}>x = {x}{"  "}</span>
      <span style={{ color: "var(--teal)" }}>f(x) = {y}</span>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
export const SolverPage = ({ activeMethod, setActiveMethod, calculated, onCalculate }) => {
  const selected = METHODS.find((m) => m.id === activeMethod);

  // ── Inputs del método ────────────────────────────────────────────────────────
  const [funcExpr,  setFuncExpr]  = useState("x^2 - x - 2");
  const [aValue,    setAValue]    = useState("1");
  const [bValue,    setBValue]    = useState("3");
  const [x0Value,   setX0Value]   = useState("1.5");
  const [x1Value,   setX1Value]   = useState("2.5");
  const [tolerance, setTolerance] = useState("0.0001");

  // ── Rango de escaneo (solo métodos abiertos) ─────────────────────────────────
  const [scanMin,       setScanMin]       = useState("");
  const [scanMax,       setScanMax]       = useState("");
  const [showScanRange, setShowScanRange] = useState(false);

  // ── Estado resultado ─────────────────────────────────────────────────────────
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Cambio de método ─────────────────────────────────────────────────────────
  const handleMethodChange = (methodId) => {
    setActiveMethod(methodId);
    setResult(null);
    setError(null);
    setScanMin("");
    setScanMax("");
    setShowScanRange(false);
  };

  // ── Cálculo ──────────────────────────────────────────────────────────────────
  const handleCalculate = () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const tol = parseFloat(tolerance);
      if (isNaN(tol) || tol <= 0) {
        setError("Tolerancia inválida. Debe ser un número positivo.");
        setLoading(false);
        return;
      }

      let res;
      switch (activeMethod) {
        case "biseccion":  res = biseccion(funcExpr, aValue, bValue, tol);     break;
        case "reglafalsa": res = reglaFalsa(funcExpr, aValue, bValue, tol);    break;
        case "newton":     res = newtonRaphson(funcExpr, x0Value, tol);        break;
        case "secante":    res = secante(funcExpr, x0Value, x1Value, tol);     break;
        case "puntofijo":  res = puntoFijo(funcExpr, x0Value, tol);            break;
        default:
          setError("Método no seleccionado.");
          setLoading(false);
          return;
      }

      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      // ── Detección de raíces múltiples ────────────────────────────────────────
      if (activeMethod !== "puntofijo") {
        let xMin, xMax;
        if (activeMethod === "biseccion" || activeMethod === "reglafalsa") {
          const a = parseFloat(aValue), b = parseFloat(bValue);
          const span = Math.abs(b - a);
          xMin = a - span;
          xMax = b + span;
        } else {
          const userMin = parseFloat(scanMin), userMax = parseFloat(scanMax);
          const x0 = parseFloat(x0Value);
          if (isFinite(userMin) && isFinite(userMax) && userMin < userMax) {
            xMin = userMin; xMax = userMax;
          } else {
            xMin = (isFinite(x0) ? x0 : 0) - 10;
            xMax = (isFinite(x0) ? x0 : 0) + 10;
          }
        }
        res.rootsInfo = detectMultipleRoots(funcExpr, xMin, xMax);
        res.scanRange = { xMin, xMax };
      }

      setResult(res);
      onCalculate();
    } catch (err) {
      setError("Error durante el cálculo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Puntos para el gráfico ───────────────────────────────────────────────────
  const graphPoints = useMemo(() => {
    let xMin = -5, xMax = 5;
    if (selected?.type === "cerrado") {
      const a = parseFloat(aValue), b = parseFloat(bValue);
      if (isFinite(a) && isFinite(b)) {
        const span = Math.abs(b - a);
        xMin = a - span * 0.5;
        xMax = b + span * 0.5;
      }
    } else {
      const x0 = parseFloat(x0Value);
      if (isFinite(x0)) { xMin = x0 - 5; xMax = x0 + 5; }
      const uMin = parseFloat(scanMin), uMax = parseFloat(scanMax);
      if (isFinite(uMin) && isFinite(uMax) && uMin < uMax) {
        xMin = uMin; xMax = uMax;
      }
    }
    return getFunctionPoints(funcExpr, xMin, xMax);
  }, [funcExpr, aValue, bValue, x0Value, scanMin, scanMax, selected?.type]);

  const rootForLine = result?.root ? parseFloat(result.root.toFixed(4)) : null;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="solver fade-up">

      {/* Header */}
      <div className="page-header">
        <div className="page-eyebrow">Solver</div>
        <h2 className="page-title">Calculá <em>paso a paso</em></h2>
      </div>

      {/* ── Tabs de métodos ── */}
      <div className="method-tabs">
        {METHODS.map((m) => (
          <button
            key={m.id}
            className={`method-tab${activeMethod === m.id ? " active" : ""}`}
            onClick={() => handleMethodChange(m.id)}
          >
            <span className="tab-name">{m.name}</span>
            <span className="tab-type">{m.type}</span>
          </button>
        ))}
      </div>

      {/* ── Descripción del método activo ── */}
      {selected && (
        <div className="method-desc">
          {selected.desc || {
            biseccion:  "Divide [a,b] a la mitad. Convergencia garantizada si f(a)·f(b) < 0.",
            reglafalsa: "Interpolación lineal entre a y b. Más rápido que bisección en funciones suaves.",
            newton:     "Usa f′(x) numérica para convergencia cuadrática. Muy rápido cerca de la raíz.",
            secante:    "Aproxima f′(x) con dos puntos. No necesita derivada analítica.",
            puntofijo:  "Itera x = g(x). Converge si |g′(x)| < 1 en el entorno de la raíz.",
          }[activeMethod]}
        </div>
      )}

      {/* ── Grid principal ── */}
      <div className="solver-grid">

        {/* ── Panel izquierdo: Configuración ── */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Configuración</span>
            <MethodTypeTag type={selected?.type} />
          </div>
          <div className="panel-body">

            {/* Función */}
            <div className="field">
              <label>f(x)</label>
              <input
                type="text"
                value={funcExpr}
                onChange={(e) => setFuncExpr(e.target.value)}
                placeholder="x^2 - x - 2"
              />
              <small>^ potencia · * multiplicar</small>
            </div>

            {/* Intervalo [a, b] — métodos cerrados */}
            {selected?.type === "cerrado" && (
              <div className="field">
                <label>Intervalo [a, b]</label>
                <div className="field-row">
                  <input type="text" value={aValue} onChange={(e) => setAValue(e.target.value)} placeholder="a" />
                  <input type="text" value={bValue} onChange={(e) => setBValue(e.target.value)} placeholder="b" />
                </div>
              </div>
            )}

            {/* Punto(s) inicial(es) — métodos abiertos */}
            {selected?.type === "abierto" && (
              <div className="field">
                <label>{activeMethod === "secante" ? "Puntos iniciales" : "Punto inicial"}</label>
                <input type="text" value={x0Value} onChange={(e) => setX0Value(e.target.value)} placeholder="x₀" />
                {activeMethod === "secante" && (
                  <input
                    type="text"
                    value={x1Value}
                    onChange={(e) => setX1Value(e.target.value)}
                    placeholder="x₁"
                    style={{ marginTop: "8px" }}
                  />
                )}
              </div>
            )}

            {/* Rango de escaneo — solo métodos abiertos */}
            {selected?.type === "abierto" && (
              <div className="field">
                <button
                  className="scan-toggle"
                  onClick={() => setShowScanRange((v) => !v)}
                  type="button"
                >
                  <span className="scan-toggle-left">
                    <span className="scan-arrow">{showScanRange ? "▾" : "▸"}</span>
                    Rango de escaneo
                  </span>
                  <span className="scan-toggle-hint">
                    {scanMin !== "" && scanMax !== "" ? `[${scanMin}, ${scanMax}]` : "x₀ ± 10"}
                  </span>
                </button>
                {showScanRange && (
                  <div className="scan-body">
                    <div className="field-row" style={{ marginTop: "10px" }}>
                      <div>
                        <label>x mín</label>
                        <input type="text" value={scanMin} onChange={(e) => setScanMin(e.target.value)} placeholder="-10" />
                      </div>
                      <div>
                        <label>x máx</label>
                        <input type="text" value={scanMax} onChange={(e) => setScanMax(e.target.value)} placeholder="10" />
                      </div>
                    </div>
                    <small>Máx. 200 unidades de rango.</small>
                  </div>
                )}
              </div>
            )}

            {/* Tolerancia */}
            <div className="field">
              <label>Tolerancia</label>
              <input
                type="text"
                value={tolerance}
                onChange={(e) => setTolerance(e.target.value)}
                placeholder="0.0001"
              />
              <small>0.001 → error &lt; 0.1%</small>
            </div>

            <div className="divider"><span>listo</span></div>

            <button
              className="btn-run"
              onClick={handleCalculate}
              disabled={loading}
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Calculando..." : "Calcular"}
            </button>

            {error && <div className="solver-error">⚠ {error}</div>}
          </div>
        </div>

        {/* ── Panel derecho: Resultado ── */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Resultado</span>
            {result && (
              <span style={{ fontSize: "9px", color: "var(--muted)", letterSpacing: "1px" }}>
                {result.totalIter} iteracion{result.totalIter !== 1 ? "es" : ""}
              </span>
            )}
          </div>
          <div className="panel-body">

            {!result ? (
              <div className="result-placeholder">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
                <p>Configurá y calculá</p>
              </div>
            ) : (
              <div className="fade-up">

                {/* Status bar */}
                <div
                  className="status-bar"
                  style={{
                    background: result.converged ? "rgba(108,189,181,0.1)" : "rgba(255,180,100,0.1)",
                    borderColor: result.converged ? "rgba(108,189,181,0.3)" : "rgba(255,150,50,0.3)",
                  }}
                >
                  <div className="status-dot" style={{ background: result.converged ? "var(--teal)" : "#ff9933" }} />
                  <span className="status-text" style={{ color: result.converged ? "var(--teal)" : "#ff9933" }}>
                    {result.converged
                      ? `Convergencia · raíz ≈ ${result.root}`
                      : `Sin convergencia tras ${result.totalIter} iteraciones`}
                  </span>
                </div>

                {/* Gráfico */}
                <div className="graph-area">
                  {/* Label izquierda */}
                  <span className="graph-label">f(x) = {funcExpr}</span>
                  {/* Label derecha — raíz */}
                  {result.converged && rootForLine && (
                    <span className="graph-root-label">Raíz ≈ {result.root}</span>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={graphPoints} margin={{ top: 28, right: 16, left: -20, bottom: 4 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
                      <XAxis
                        dataKey="x"
                        tick={{ fontSize: 9, fill: "var(--muted)", fontFamily: "'DM Mono', monospace" }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 9, fill: "var(--muted)", fontFamily: "'DM Mono', monospace" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={0} stroke="var(--muted)" strokeWidth={1} />
                      {rootForLine && (
                        <ReferenceLine x={rootForLine} stroke="var(--teal)" strokeDasharray="5 3" strokeWidth={1.5} />
                      )}
                      <Line
                        type="monotone"
                        dataKey="y"
                        stroke="var(--teal)"
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Tabla de iteraciones */}
                <div className="table-wrap">
                  <table className="iter-table">
                    <thead>
                      <tr>
                        {(activeMethod === "biseccion" || activeMethod === "reglafalsa") && (
                          <><th>n</th><th>a</th><th>b</th><th>c</th><th>f(c)</th><th>err (%)</th></>
                        )}
                        {activeMethod === "newton" && (
                          <><th>n</th><th>xₙ</th><th>f(xₙ)</th><th>f′(xₙ)</th><th>xₙ₊₁</th><th>err (%)</th></>
                        )}
                        {activeMethod === "secante" && (
                          <><th>n</th><th>x₀</th><th>x₁</th><th>x₂</th><th>f(x₂)</th><th>err (%)</th></>
                        )}
                        {activeMethod === "puntofijo" && (
                          <><th>n</th><th>xₙ</th><th>g(xₙ)</th><th>err (%)</th></>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {result.iterations.map((row, idx) => (
                        <tr key={idx} className={row.converged ? "converged" : ""}>
                          {(activeMethod === "biseccion" || activeMethod === "reglafalsa") && (
                            <><td>{row.n}</td><td>{row.a}</td><td>{row.b}</td>
                            <td>{row.c}</td><td>{row.fc}</td>
                            <td>{row.err !== null ? `${row.err}%` : "—"}</td></>
                          )}
                          {activeMethod === "newton" && (
                            <><td>{row.n}</td><td>{row.x}</td><td>{row.fx}</td>
                            <td>{row.fpx}</td><td>{row.x1}</td><td>{row.err}%</td></>
                          )}
                          {activeMethod === "secante" && (
                            <><td>{row.n}</td><td>{row.x0}</td><td>{row.x1}</td>
                            <td>{row.x2}</td><td>{row.fx2}</td><td>{row.err}%</td></>
                          )}
                          {activeMethod === "puntofijo" && (
                            <><td>{row.n}</td><td>{row.x}</td><td>{row.gx}</td><td>{row.err}%</td></>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* AI Insight */}
                <div className="ai-insight">
                  <div className="ai-label">
                    {result.converged ? "✓ Convergencia alcanzada" : "⚠ No convergió"}
                  </div>
                  <p className="ai-text">
                    {result.converged
                      ? `El método ${selected.name} convergió en ${result.totalIter} iteración${result.totalIter !== 1 ? "es" : ""} a la raíz x = ${result.root}. La tolerancia fue satisfecha dentro de los parámetros especificados.`
                      : `El método alcanzó el máximo de iteraciones (${result.totalIter}) sin converger. Intentá ajustar los parámetros iniciales o la tolerancia.`}
                  </p>

                  {/* Alerta raíces múltiples */}
                  {result.converged && result.rootsInfo?.count > 1 && (
                    <div className="multi-root-alert">
                      <p className="multi-root-title">⚠ Raíces múltiples detectadas</p>
                      <p className="multi-root-body">
                        El análisis del dominio{" "}
                        <span className="multi-root-range">
                          [{result.scanRange?.xMin?.toFixed(1)}, {result.scanRange?.xMax?.toFixed(1)}]
                        </span>{" "}
                        sugiere <strong>{result.rootsInfo.count} posibles raíces</strong>.
                        Solo se encontró la más cercana al punto inicial. Cambiá tu{" "}
                        {selected?.type === "cerrado" ? "intervalo [a, b]" : "x₀"}{" "}
                        para explorar las demás.
                      </p>
                      <div className="chips-row">
                        {result.rootsInfo.intervals.map((iv, i) => (
                          <span key={i} className="root-chip">[{iv.a}, {iv.b}]</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};