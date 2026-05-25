import React, { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { METHODS, ROOT_METHODS, LINEAR_METHODS, METHOD_GUIDE } from "../constants/data";
import { isLinearSolverMethod } from "../utils/linearSystems";
import { LinearSystemSolver } from "../components/LinearSystemSolver";
import { MethodTypeTag } from "../components/MethodTypeTag";
import { MethodTooltip } from "../components/MethodTooltip";
import { FriendlyErrorBox } from "../components/FriendlyErrorBox";
import { useIka } from "../context/IkaContext";
import { API_BASE } from "../config/apiBase.js";
import { analyzeConvergence } from "../utils/convergenceAnalyzer";
import { calculateZoomedRange, getDefaultCenter } from "../utils/graphUtils";
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

// ─── Tooltip del gráfico (mejorado con indicador de cercanía a raíz) ─────────
const CustomTooltip = ({ active, payload, rootValue }) => {
  if (!active || !payload?.length) return null;
  const { x, y } = payload[0].payload;
  const nearRoot = rootValue !== null && Math.abs(parseFloat(x) - rootValue) < 0.15;
  return (
    <div className="graph-tooltip">
      <div className="graph-tooltip-row">
        <span className="graph-tooltip-label">x =</span>
        <span className="graph-tooltip-value">{parseFloat(x).toFixed(4)}</span>
      </div>
      <div className="graph-tooltip-row">
        <span className="graph-tooltip-label">f(x) =</span>
        <span className="graph-tooltip-value">{y !== null ? parseFloat(y).toFixed(6) : "∞"}</span>
      </div>
      {nearRoot && (
        <div className="graph-tooltip-row highlight">
          <span className="graph-tooltip-label">⭐ Cerca de la raíz</span>
        </div>
      )}
    </div>
  );
};

// ─── GuideAcordion: desplegable paso a paso ───────────────────────────────────
const GuideAcordion = ({ methodId, funcExpr }) => {
  const [open, setOpen] = useState(false);
  const guide = METHOD_GUIDE[methodId];
  if (!guide) return null;

  const isClosed = methodId === "biseccion" || methodId === "reglafalsa";
  const isNewton = methodId === "newton";
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
  const isLinear = isLinearSolverMethod(activeMethod);

  React.useEffect(() => {
    if (!METHODS.some((m) => m.id === activeMethod)) {
      navigate("/solver/biseccion", { replace: true });
    }
  }, [activeMethod, navigate]);

  const [funcExpr, setFuncExpr] = useState("x^2 - x - 2");
  const [aValue, setAValue] = useState("1");
  const [bValue, setBValue] = useState("3");
  const [x0Value, setX0Value] = useState("1.5");
  const [x1Value, setX1Value] = useState("2.5");
  const [tolerance, setTolerance] = useState("0.0001");

  const [scanMin, setScanMin] = useState("");
  const [scanMax, setScanMax] = useState("");
  const [showScanRange, setShowScanRange] = useState(false);

  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Fase 1: Zoom del gráfico ──
  const [zoomLevel, setZoomLevel] = useState(1);

  // ── Fase 3: Iteración seleccionada en la tabla ──
  const [selectedIter, setSelectedIter] = useState(null);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((z) => Math.min(z * 1.4, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((z) => Math.max(z / 1.4, 0.3));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1);
  }, []);

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


  const fetchAiExplanation = async (calcResult) => {
    setAiLoading(true);
    setAiExplanation(null);
    setAiError(null);

    try {
      const res = await fetch(`${API_BASE}/api/ai/explain`, {
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
    setZoomLevel(1);
    setSelectedIter(null);
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
        case "biseccion": res = biseccion(funcExpr, aValue, bValue, tol); break;
        case "reglafalsa": res = reglaFalsa(funcExpr, aValue, bValue, tol); break;
        case "newton": res = newtonRaphson(funcExpr, x0Value, tol); break;
        case "secante": res = secante(funcExpr, x0Value, x1Value, tol); break;
        case "puntofijo": res = puntoFijo(funcExpr, x0Value, tol); break;
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

  // ── Rango base del gráfico ──
  const baseRange = useMemo(() => {
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
    return { xMin, xMax };
  }, [aValue, bValue, x0Value, scanMin, scanMax, selected?.type]);

  const rootForLine = result?.root ? parseFloat(result.root.toFixed(4)) : null;

  // ── Aplica zoom al rango y genera puntos ──
  const graphPoints = useMemo(() => {
    const center = getDefaultCenter(baseRange.xMin, baseRange.xMax, rootForLine);
    const { min, max } = calculateZoomedRange(baseRange.xMin, baseRange.xMax, zoomLevel, center);
    return getFunctionPoints(funcExpr, min, max, 300);
  }, [funcExpr, baseRange, zoomLevel, rootForLine]);

  const currentXMin = graphPoints.length > 0 ? graphPoints[0].x : baseRange.xMin;
  const currentXMax = graphPoints.length > 0 ? graphPoints[graphPoints.length - 1].x : baseRange.xMax;

  // ── Punto de la iteración seleccionada (Fase 3) ──
  const selectedIterX = useMemo(() => {
    if (selectedIter === null || !result?.iterations?.[selectedIter]) return null;
    const row = result.iterations[selectedIter];
    // Según el método, el "punto aproximado" está en distintas columnas
    const val = row.c ?? row.x1 ?? row.x2 ?? row.gx ?? row.x;
    return val !== undefined ? parseFloat(Number(val).toFixed(4)) : null;
  }, [selectedIter, result]);

  return (
    <div className="solver fade-up">

      {/* Header */}
      <div className="page-header">
        <div className="page-eyebrow">Solver</div>
        <h2 className="page-title">Calculá <em>paso a paso</em></h2>
      </div>

      <div className="method-tabs-groups">
        <span className="method-tabs-label">Raíces de f(x)</span>
        <div className="method-tabs">
          {ROOT_METHODS.map((m) => (
            <MethodTooltip key={m.id} methodId={m.id}>
              <button
                type="button"
                className={`method-tab${activeMethod === m.id ? " active" : ""}`}
                onClick={() => handleMethodChange(m.id)}
              >
                <span className="tab-name">{m.name}</span>
                <span className="tab-type">{m.type}</span>
              </button>
            </MethodTooltip>
          ))}
        </div>
        <span className="method-tabs-label">Sistemas lineales Ax = b</span>
        <div className="method-tabs">
          {LINEAR_METHODS.map((m) => (
            <MethodTooltip key={m.id} methodId={m.id}>
              <button
                type="button"
                className={`method-tab${activeMethod === m.id ? " active" : ""}`}
                onClick={() => handleMethodChange(m.id)}
              >
                <span className="tab-name">{m.name}</span>
                <span className="tab-type">{m.type.replace("lineal-", "")}</span>
              </button>
            </MethodTooltip>
          ))}
        </div>
      </div>

      {/* ── Descripción del método ── */}
      {selected && (
        <div className="method-desc">
          {{
            biseccion: "Divide [a,b] a la mitad. Convergencia garantizada si f(a)·f(b) < 0.",
            reglafalsa: "Interpolación lineal entre a y b. Más rápido que bisección en funciones suaves.",
            newton: "Usa f′(x) numérica para convergencia cuadrática. Muy rápido cerca de la raíz.",
            secante: "Aproxima f′(x) con dos puntos. No necesita derivada analítica.",
            puntofijo: "Itera x = g(x). Converge si |g′(x)| < 1 en el entorno de la raíz.",
            gauss: "Triangulariza la matriz ampliada y obtiene la solución por sustitución hacia atrás.",
            gaussjordan: "Reduce [A|b] a forma escalonada; la solución aparece en la última columna.",
            cramer: "Cada incógnita es un cociente de determinantes (2×2 y 3×3).",
            jacobi: "Despeja cada xᵢ y actualiza en paralelo hasta cumplir la tolerancia.",
            gaussseidel: "Como Jacobi, reutilizando valores ya actualizados en la misma iteración.",
          }[activeMethod]}
        </div>
      )}

      {isLinear ? (
        <LinearSystemSolver
          methodId={activeMethod}
          methodName={selected?.name}
          methodType={selected?.type}
        />
      ) : (
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
              <FriendlyErrorBox errorMsg={error} />
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

                {/* ── Gráfico mejorado con zoom y controles ── */}
                <div className="graph-container">
                  <div className="graph-header">
                    <span className="graph-label">f(x) = {funcExpr}</span>
                    <div className="graph-controls">
                      {result.converged && rootForLine && (
                        <span className="graph-root-badge">Raíz ≈ {result.root}</span>
                      )}
                      <button className="zoom-btn" onClick={handleZoomOut} type="button" title="Alejar">−</button>
                      <button className="zoom-btn" onClick={handleZoomReset} type="button" title="Resetear zoom">{zoomLevel === 1 ? "1x" : `${zoomLevel.toFixed(1)}x`}</button>
                      <button className="zoom-btn" onClick={handleZoomIn} type="button" title="Acercar">+</button>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={graphPoints} margin={{ top: 16, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
                      <XAxis
                        dataKey="x"
                        tick={{ fontSize: 10, fill: "var(--muted)", fontFamily: "'DM Mono', monospace" }}
                        interval="preserveStartEnd"
                        label={{ value: "x", position: "insideBottomRight", offset: -5, fontSize: 11, fill: "var(--muted)" }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "var(--muted)", fontFamily: "'DM Mono', monospace" }}
                        label={{ value: "f(x)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "var(--muted)" }}
                      />
                      <Tooltip content={<CustomTooltip rootValue={rootForLine} />} />
                      <ReferenceLine y={0} stroke="var(--muted)" strokeWidth={1.2} />
                      {rootForLine && (
                        <ReferenceLine
                          x={rootForLine}
                          stroke="var(--teal)"
                          strokeDasharray="6 3"
                          strokeWidth={2}
                          label={{ value: `x=${rootForLine}`, position: "top", fill: "var(--teal)", fontSize: 9, fontFamily: "'DM Mono', monospace" }}
                        />
                      )}
                      {/* Fase 3: Línea de la iteración seleccionada */}
                      {selectedIterX !== null && (
                        <ReferenceLine
                          x={selectedIterX}
                          stroke="#f59e42"
                          strokeDasharray="4 3"
                          strokeWidth={2}
                          label={{ value: `Iter ${selectedIter + 1}`, position: "top", fill: "#f59e42", fontSize: 9 }}
                        />
                      )}
                      <Line type="monotone" dataKey="y" stroke="var(--teal)" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="graph-footer">
                    <span className="graph-range-label">Rango X: [{currentXMin}, {currentXMax}]</span>
                    <span className="graph-range-label">Zoom: {zoomLevel.toFixed(1)}x</span>
                  </div>
                </div>

                <div className="table-wrap">
                  <table className="iter-table">
                    <thead>
                      <tr>
                        {(activeMethod === "biseccion" || activeMethod === "reglafalsa") && <><th>n</th><th>a</th><th>b</th><th>c</th><th>f(c)</th><th>err (%)</th></>}
                        {activeMethod === "newton" && <><th>n</th><th>xₙ</th><th>f(xₙ)</th><th>f′(xₙ)</th><th>xₙ₊₁</th><th>err (%)</th></>}
                        {activeMethod === "secante" && <><th>n</th><th>x₀</th><th>x₁</th><th>x₂</th><th>f(x₂)</th><th>err (%)</th></>}
                        {activeMethod === "puntofijo" && <><th>n</th><th>xₙ</th><th>g(xₙ)</th><th>err (%)</th></>}
                      </tr>
                    </thead>
                    <tbody>
                      {result.iterations.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`${row.converged ? "converged" : ""}${selectedIter === idx ? " selected" : ""}`}
                          onClick={() => setSelectedIter(selectedIter === idx ? null : idx)}
                          title="Click para marcar esta iteración en el gráfico"
                        >
                          {(activeMethod === "biseccion" || activeMethod === "reglafalsa") && <><td>{row.n}</td><td>{row.a}</td><td>{row.b}</td><td>{row.c}</td><td>{row.fc}</td><td>{row.err !== null ? `${row.err}%` : "—"}</td></>}
                          {activeMethod === "newton" && <><td>{row.n}</td><td>{row.x}</td><td>{row.fx}</td><td>{row.fpx}</td><td>{row.x1}</td><td>{row.err}%</td></>}
                          {activeMethod === "secante" && <><td>{row.n}</td><td>{row.x0}</td><td>{row.x1}</td><td>{row.x2}</td><td>{row.fx2}</td><td>{row.err}%</td></>}
                          {activeMethod === "puntofijo" && <><td>{row.n}</td><td>{row.x}</td><td>{row.gx}</td><td>{row.err}%</td></>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Análisis de convergencia (local, sin IA) ── */}
                {(() => {
                  const convergenceInfo = analyzeConvergence(result, activeMethod, {
                    a: aValue, b: bValue, x0: x0Value, x1: x1Value, tolerance,
                  });
                  return (
                    <div className="convergence-box">
                      <div className="convergence-header">
                        <span className="convergence-icon">{result.converged ? "✓" : "⚠"}</span>
                        <span className="convergence-title">
                          {result.converged ? "Análisis de Convergencia" : "Análisis de No Convergencia"}
                        </span>
                      </div>
                      <p className="convergence-text">{convergenceInfo.explanation}</p>
                      {result.converged && (
                        <div className="convergence-next">
                          <span className="convergence-next-label">🎯 Próximos pasos:</span>
                          <ul className="convergence-next-list">
                            <li>Reducí la tolerancia si necesitás mayor precisión</li>
                            <li>Compará con otros métodos en la sección "Comparar"</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── IA Insight ── */}
                <div className="ai-insight">
                  <div className="ai-label">
                    <span className="ai-label-icon">✦</span>
                    {aiLoading ? "NumérikaAI analizando..." : "Explicación IA"}
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
                    <p className="ai-text" style={{ fontStyle: "italic" }}>
                      {aiError
                        ? `IA no disponible: ${aiError}`
                        : "Esperando respuesta de la IA..."}
                    </p>
                  )}
                </div>

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
            )}

            {/* ── GuideAcordion: debajo del gráfico, dentro del panel derecho ── */}
            <GuideAcordion methodId={activeMethod} funcExpr={funcExpr} />

          </div>
        </div>

      </div>
      )}

    </div>
  );
};
