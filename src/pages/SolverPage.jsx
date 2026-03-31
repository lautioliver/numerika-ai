import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { METHODS, METHOD_GUIDE } from "../constants/data";
import { MethodTypeTag } from "../components/MethodTypeTag";
import { useIka } from "../context/IkaContext";
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

// ─── GuideAcordion: desplegable paso a paso ───────────────────────────────────
const GuideAcordion = ({ methodId, funcExpr }) => {
  const [open, setOpen] = useState(false);
  const guide = METHOD_GUIDE[methodId];
  if (!guide) return null;

  const isClosed  = methodId === "biseccion" || methodId === "reglafalsa";
  const isNewton  = methodId === "newton";
  const isSecante = methodId === "secante";
  const isPtoFijo = methodId === "puntofijo";

  return (
    <div className="stepbystep">
      <button
        className="stepbystep-toggle"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <span className="stepbystep-toggle-left">
          <span className="stepbystep-arrow">{open ? "▾" : "▸"}</span>
          Procedimiento y ejemplo de cálculo
        </span>
        <span className="stepbystep-badge">
          {open ? "Cerrar" : "Ver detalle"}
        </span>
      </button>

      {open && (
        <div className="stepbystep-body fade-up">

          {/* Fórmula principal */}
          <div className="stepbystep-formula">
            <span className="stepbystep-formula-label">Fórmula</span>
            <code className="stepbystep-formula-code">{guide.formula}</code>
          </div>

          {/* Procedimiento */}
          <div className="stepbystep-section">
            <div className="stepbystep-section-title">Procedimiento</div>
            <ol className="stepbystep-list">
              {guide.procedimiento.map((paso, i) => (
                <li key={i}>{paso}</li>
              ))}
            </ol>
          </div>

          {/* Ejemplo numérico */}
          <div className="stepbystep-section">
            <div className="stepbystep-section-title">
              Ejemplo numérico
              {funcExpr && (
                <span className="stepbystep-func"> · f(x) = {funcExpr}</span>
              )}
            </div>
            <p className="stepbystep-enunciado">{guide.ejemplo.enunciado}</p>

            <div className="table-wrap" style={{ marginTop: "10px" }}>
              <table className="iter-table">
                <thead>
                  <tr>
                    {isClosed  && <><th>n</th><th>a</th><th>b</th><th>c</th><th>f(c)</th><th>err (%)</th><th>nota</th></>}
                    {isNewton  && <><th>n</th><th>xₙ</th><th>f(xₙ)</th><th>f′(xₙ)</th><th>xₙ₊₁</th><th>err (%)</th><th>nota</th></>}
                    {isSecante && <><th>n</th><th>x₀</th><th>x₁</th><th>x₂</th><th>f(x₂)</th><th>err (%)</th><th>nota</th></>}
                    {isPtoFijo && <><th>n</th><th>xₙ</th><th>g(xₙ)</th><th>err (%)</th><th>nota</th></>}
                  </tr>
                </thead>
                <tbody>
                  {guide.ejemplo.pasos.map((row, i) => (
                    <tr key={i}>
                      {isClosed  && <><td>{row.n}</td><td>{row.a}</td><td>{row.b}</td><td>{row.c}</td><td>{row.fc}</td><td>{row.err}</td><td className="stepbystep-nota">{row.nota}</td></>}
                      {isNewton  && <><td>{row.n}</td><td>{row.x}</td><td>{row.fx}</td><td>{row.fpx}</td><td>{row.x1}</td><td>{row.err}</td><td className="stepbystep-nota">{row.nota}</td></>}
                      {isSecante && <><td>{row.n}</td><td>{row.x0}</td><td>{row.x1}</td><td>{row.x2}</td><td>{row.fx2}</td><td>{row.err}</td><td className="stepbystep-nota">{row.nota}</td></>}
                      {isPtoFijo && <><td>{row.n}</td><td>{row.x}</td><td>{row.gx}</td><td>{row.err}</td><td className="stepbystep-nota">{row.nota}</td></>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="stepbystep-conclusion">{guide.ejemplo.conclusion}</p>
          </div>

        </div>
      )}
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
export const SolverPage = () => {
  const { methodId } = useParams();
  const navigate = useNavigate();
  const activeMethod = methodId || "biseccion";
  const selected = METHODS.find((m) => m.id === activeMethod);

  const [funcExpr,  setFuncExpr]  = useState("x^2 - x - 2");
  const [aValue,    setAValue]    = useState("1");
  const [bValue,    setBValue]    = useState("3");
  const [x0Value,   setX0Value]   = useState("1.5");
  const [x1Value,   setX1Value]   = useState("2.5");
  const [tolerance, setTolerance] = useState("0.0001");

  const [scanMin,       setScanMin]       = useState("");
  const [scanMax,       setScanMax]       = useState("");
  const [showScanRange, setShowScanRange] = useState(false);

  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Contexto de la Asistente IKA ──
  const { updateContext } = useIka();

  React.useEffect(() => {
    let details = `Página del solver. Método seleccionado: ${selected?.name}. Función f(x) = ${funcExpr}. Parámetros ingresados: `;
    if (selected?.type === "cerrado") details += `[a=${aValue}, b=${bValue}]. `;
    else details += `[x0=${x0Value}, x1=${x1Value}]. `;

    if (result) {
      if (result.converged) {
        details += `Estado: ACABA de calcular y le CONVERGIÓ a x = ${result.root} en ${result.totalIter} iteraciones.`;
      } else {
        details += `Estado: Calculó pero NO CONVERGIÓ. Alcanzó las ${result.totalIter} iteraciones sin hallar la raíz.`;
      }
    } else {
      details += "Estado: Mirando la interfaz, aún no presionó Calcular.";
    }

    if (error) {
      details += ` Además, tiene un error visible: ${error}.`;
    }

    updateContext(`Solver - ${selected?.name}`, details);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMethod, selected, funcExpr, aValue, bValue, x0Value, x1Value, result, error, updateContext]);

  // ── Estado de IA ──
  const [aiExplanation, setAiExplanation] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchAiExplanation = async (calcResult) => {
    setAiLoading(true);
    setAiExplanation(null);
    setAiError(null);

    try {
      const res = await fetch(`${API_URL}/api/ai/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: selected?.name,
          methodId: activeMethod,
          funcExpr,
          params: {
            a: aValue, b: bValue,
            x0: x0Value, x1: x1Value,
            tolerance,
          },
          result: {
            converged: calcResult.converged,
            root: calcResult.root,
            totalIter: calcResult.totalIter,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiExplanation(data.explanation);
      } else {
        setAiError(data.error);
      }
    } catch {
      setAiError("No se pudo conectar con el servicio de IA.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleMethodChange = (newMethodId) => {
    navigate(`/solver/${newMethodId}`, { replace: true });
    setResult(null);
    setError(null);
    setScanMin("");
    setScanMax("");
    setShowScanRange(false);
  };

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

      if (activeMethod !== "puntofijo") {
        let xMin, xMax;
        if (activeMethod === "biseccion" || activeMethod === "reglafalsa") {
          const a = parseFloat(aValue), b = parseFloat(bValue);
          const span = Math.abs(b - a);
          xMin = a - span; xMax = b + span;
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
      // Pedir explicación de IA en background
      fetchAiExplanation(res);
    } catch (err) {
      setError("Error durante el cálculo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const graphPoints = useMemo(() => {
    let xMin = -5, xMax = 5;
    if (selected?.type === "cerrado") {
      const a = parseFloat(aValue), b = parseFloat(bValue);
      if (isFinite(a) && isFinite(b)) {
        const span = Math.abs(b - a);
        xMin = a - span * 0.5; xMax = b + span * 0.5;
      }
    } else {
      const x0 = parseFloat(x0Value);
      if (isFinite(x0)) { xMin = x0 - 5; xMax = x0 + 5; }
      const uMin = parseFloat(scanMin), uMax = parseFloat(scanMax);
      if (isFinite(uMin) && isFinite(uMax) && uMin < uMax) { xMin = uMin; xMax = uMax; }
    }
    return getFunctionPoints(funcExpr, xMin, xMax);
  }, [funcExpr, aValue, bValue, x0Value, scanMin, scanMax, selected?.type]);

  const rootForLine = result?.root ? parseFloat(result.root.toFixed(4)) : null;

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

      {/* ── Descripción del método ── */}
      {selected && (
        <div className="method-desc">
          {{
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

        {/* Panel izquierdo: Configuración */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Configuración</span>
            <MethodTypeTag type={selected?.type} />
          </div>
          <div className="panel-body">

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

            {selected?.type === "cerrado" && (
              <div className="field">
                <label>Intervalo [a, b]</label>
                <div className="field-row">
                  <input type="text" value={aValue} onChange={(e) => setAValue(e.target.value)} placeholder="a" />
                  <input type="text" value={bValue} onChange={(e) => setBValue(e.target.value)} placeholder="b" />
                </div>
              </div>
            )}

            {selected?.type === "abierto" && (
              <div className="field">
                <label>{activeMethod === "secante" ? "Puntos iniciales" : "Punto inicial"}</label>
                <input type="text" value={x0Value} onChange={(e) => setX0Value(e.target.value)} placeholder="x₀" />
                {activeMethod === "secante" && (
                  <input type="text" value={x1Value} onChange={(e) => setX1Value(e.target.value)} placeholder="x₁" style={{ marginTop: "8px" }} />
                )}
              </div>
            )}

            {selected?.type === "abierto" && (
              <div className="field">
                <button className="scan-toggle" onClick={() => setShowScanRange((v) => !v)} type="button">
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

            <div className="field">
              <label>Tolerancia</label>
              <input type="text" value={tolerance} onChange={(e) => setTolerance(e.target.value)} placeholder="0.0001" />
              <small>0.001 → error &lt; 0.1%</small>
            </div>

            <div className="divider"><span>listo</span></div>

            <button className="btn-run" onClick={handleCalculate} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? "Calculando..." : "Calcular"}
            </button>

            {error && (
              <div style={{ marginTop: "12px", padding: "10px 13px", background: "rgba(255,200,200,0.2)", border: "1px solid rgba(255,100,100,0.5)", borderRadius: "6px", color: "#c41e3a", fontSize: "10px", lineHeight: "1.6" }}>
                ⚠ {error}
              </div>
            )}
          </div>
        </div>

        {/* Panel derecho: Resultado */}
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

                <div className="status-bar" style={{
                  background: result.converged ? "rgba(108,189,181,0.1)" : "rgba(255,180,100,0.1)",
                  borderColor: result.converged ? "rgba(108,189,181,0.3)" : "rgba(255,150,50,0.3)",
                }}>
                  <div className="status-dot" style={{ background: result.converged ? "var(--teal)" : "#ff9933" }} />
                  <span className="status-text" style={{ color: result.converged ? "var(--teal)" : "#ff9933" }}>
                    {result.converged
                      ? `Convergencia · raíz ≈ ${result.root}`
                      : `Sin convergencia tras ${result.totalIter} iteraciones`}
                  </span>
                </div>

                <div className="graph-area">
                  <span className="graph-label">f(x) = {funcExpr}</span>
                  {result.converged && rootForLine && (
                    <span className="graph-root-label">Raíz ≈ {result.root}</span>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={graphPoints} margin={{ top: 28, right: 16, left: -20, bottom: 4 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
                      <XAxis dataKey="x" tick={{ fontSize: 9, fill: "var(--muted)", fontFamily: "'DM Mono', monospace" }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9, fill: "var(--muted)", fontFamily: "'DM Mono', monospace" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={0} stroke="var(--muted)" strokeWidth={1} />
                      {rootForLine && <ReferenceLine x={rootForLine} stroke="var(--teal)" strokeDasharray="5 3" strokeWidth={1.5} />}
                      <Line type="monotone" dataKey="y" stroke="var(--teal)" strokeWidth={2} dot={false} connectNulls={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="table-wrap">
                  <table className="iter-table">
                    <thead>
                      <tr>
                        {(activeMethod === "biseccion" || activeMethod === "reglafalsa") && <><th>n</th><th>a</th><th>b</th><th>c</th><th>f(c)</th><th>err (%)</th></>}
                        {activeMethod === "newton"    && <><th>n</th><th>xₙ</th><th>f(xₙ)</th><th>f′(xₙ)</th><th>xₙ₊₁</th><th>err (%)</th></>}
                        {activeMethod === "secante"   && <><th>n</th><th>x₀</th><th>x₁</th><th>x₂</th><th>f(x₂)</th><th>err (%)</th></>}
                        {activeMethod === "puntofijo" && <><th>n</th><th>xₙ</th><th>g(xₙ)</th><th>err (%)</th></>}
                      </tr>
                    </thead>
                    <tbody>
                      {result.iterations.map((row, idx) => (
                        <tr key={idx} className={row.converged ? "converged" : ""}>
                          {(activeMethod === "biseccion" || activeMethod === "reglafalsa") && <><td>{row.n}</td><td>{row.a}</td><td>{row.b}</td><td>{row.c}</td><td>{row.fc}</td><td>{row.err !== null ? `${row.err}%` : "—"}</td></>}
                          {activeMethod === "newton"    && <><td>{row.n}</td><td>{row.x}</td><td>{row.fx}</td><td>{row.fpx}</td><td>{row.x1}</td><td>{row.err}%</td></>}
                          {activeMethod === "secante"   && <><td>{row.n}</td><td>{row.x0}</td><td>{row.x1}</td><td>{row.x2}</td><td>{row.fx2}</td><td>{row.err}%</td></>}
                          {activeMethod === "puntofijo" && <><td>{row.n}</td><td>{row.x}</td><td>{row.gx}</td><td>{row.err}%</td></>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="ai-insight">
                  <div className="ai-label">
                    <span className="ai-label-icon">✦</span>
                    {aiLoading ? "NumérikaAI analizando..." : (result.converged ? "✓ Convergencia alcanzada" : "⚠ No convergió")}
                  </div>

                  {aiLoading ? (
                    <div className="ai-skeleton">
                      <div className="skeleton-line" style={{ width: "95%" }} />
                      <div className="skeleton-line" style={{ width: "80%" }} />
                      <div className="skeleton-line" style={{ width: "88%" }} />
                    </div>
                  ) : aiExplanation ? (
                    <p className="ai-text">{aiExplanation}</p>
                  ) : (
                    <p className="ai-text">
                      {aiError
                        ? `${result.converged
                            ? `El método ${selected.name} convergió en ${result.totalIter} iteración${result.totalIter !== 1 ? "es" : ""} a la raíz x = ${result.root}.`
                            : `El método alcanzó el máximo de iteraciones (${result.totalIter}) sin converger.`
                          } (IA no disponible: ${aiError})`
                        : (result.converged
                            ? `El método ${selected.name} convergió en ${result.totalIter} iteración${result.totalIter !== 1 ? "es" : ""} a la raíz x = ${result.root}. La tolerancia fue satisfecha.`
                            : `El método alcanzó el máximo de iteraciones (${result.totalIter}) sin converger. Intentá ajustar los parámetros.`
                          )
                      }
                    </p>
                  )}

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

            {/* ── GuideAcordion: debajo del gráfico, dentro del panel derecho ── */}
            <GuideAcordion methodId={activeMethod} funcExpr={funcExpr} />

          </div>
        </div>

      </div>

    </div>
  );
};