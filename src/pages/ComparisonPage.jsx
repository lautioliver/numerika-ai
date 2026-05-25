import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  biseccion, 
  reglaFalsa, 
  newtonRaphson, 
  secante 
} from "../utils/numericalMethods";
import { METHODS } from "../constants/data";
import { useIka } from "../context/IkaContext";
import { API_BASE } from "../config/apiBase.js";
import { FriendlyErrorBox } from "../components/FriendlyErrorBox";
import { getFriendlyError } from "../utils/friendlyErrors";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

// ── Colores por método (consistentes para ambos gráficos) ──
const METHOD_COLORS = {
  biseccion: "#6cbdb5",   // teal
  reglafalsa: "#7c8cf8",  // lavender-blue
  newton: "#f59e42",      // orange
  secante: "#e06c9f",     // pink
};

// ── Tooltips personalizados ──
const TimeTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-name">{d.name}</span>
      <span className="chart-tooltip-value">
        {d.hasError ? "Error" : `${d.time} ms`}
      </span>
    </div>
  );
};

const IterTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-name">{d.name}</span>
      <span className="chart-tooltip-value">
        {d.hasError ? "Error" : `${d.totalIter} iteraciones`}
      </span>
    </div>
  );
};

export const ComparisonPage = () => {
  const [funcExpr, setFuncExpr] = useState("x^2 - x - 2");
  const [pointA, setPointA] = useState("1");
  const [pointB, setPointB] = useState("3");
  const [tolerance, setTolerance] = useState("0.0001");
  
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // IA Insight específico para la comparación
  const [aiExplanation, setAiExplanation] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Expandir detalles de error por método
  const [expandedErrors, setExpandedErrors] = useState({});


  const toggleErrorDetail = (idx) => {
    setExpandedErrors((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCompare = () => {
    setLoading(true);
    setResults([]);
    setAiExplanation(null);
    setAiError(null);
    setExpandedErrors({});

    // Pequeño timeout para permitir que la UI se actualice a estado "loading"
    setTimeout(() => {
      const tol = parseFloat(tolerance);
      
      const methodsToRun = [
        { id: "biseccion", name: "Bisección", fn: () => biseccion(funcExpr, pointA, pointB, tol) },
        { id: "reglafalsa", name: "Regla Falsa", fn: () => reglaFalsa(funcExpr, pointA, pointB, tol) },
        { id: "newton", name: "Newton-Raphson", fn: () => newtonRaphson(funcExpr, pointA, tol) }, // x0 = a
        { id: "secante", name: "Secante", fn: () => secante(funcExpr, pointA, pointB, tol) } // x0 = a, x1 = b
      ];

      const comparisonResults = methodsToRun.map(m => {
        const start = performance.now();
        const res = m.fn();
        const end = performance.now();
        
        return {
          id: m.id,
          name: m.name,
          time: Number((end - start).toFixed(2)),
          converged: res.converged,
          errorMsg: res.error,
          root: res.root,
          totalIter: res.error ? null : res.totalIter,
          finalError: res.iterations?.length > 0 ? res.iterations[res.iterations.length - 1].err : null
        };
      });

      setResults(comparisonResults);
      setLoading(false);
      
      // Llamar a la IA para analizar los resultados si hay al menos uno exitoso
      if (comparisonResults.some(r => r.converged)) {
        fetchAiComparison(comparisonResults);
      }
    }, 50);
  };

  const fetchAiComparison = async (compResults) => {
    setAiLoading(true);
    
    // Crear un resumen de los resultados para la IA
    const validResults = compResults.filter(r => !r.errorMsg);
    const resultSummary = validResults.map(r => 
      `${r.name}: ${r.converged ? 'Convergió' : 'No convergió'} en ${r.totalIter} iteraciones (Tiempo: ${r.time}ms, Raíz: ${r.root})`
    ).join("\n");

    try {
      const res = await fetch(`${API_BASE}/api/ai/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "Múltiples métodos (Comparación)",
          methodId: "comparador",
          funcExpr,
          params: { a: pointA, b: pointB, tolerance },
          result: {
            converged: validResults.some(r => r.converged),
            root: validResults.find(r => r.converged)?.root || null,
            totalIter: validResults.map(r => r.totalIter).reduce((a,b)=>a+b,0),
            summary: resultSummary
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

  // ── Contexto de la Asistente IKA ──
  const { updateContext } = useIka();

  useEffect(() => {
    let details = `Página del comparador de métodos. Función: f(x) = ${funcExpr}. Puntos ingresados: A=${pointA}, B=${pointB}. `;
    if (results.length > 0) {
      details += "El usuario acaba de ejecutar una comparación y esta es la tabla de resultados: " + 
        results.map(r => `[${r.name}: ${r.errorMsg ? 'Dio error' : (r.converged ? `Convergió a ${r.root} en ${r.totalIter} iteraciones` : 'No convergió')}]`).join(' | ');
    } else {
      details += "Aún no ha comparado nada.";
    }
    updateContext("Comparador", details);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcExpr, pointA, pointB, results, updateContext]);

  // ── Datos para gráficos ──
  const chartData = results.map(r => ({
    name: r.name,
    shortName: r.name.length > 10 ? r.name.substring(0, 9) + "…" : r.name,
    id: r.id,
    time: r.errorMsg ? 0 : r.time,
    totalIter: r.errorMsg ? 0 : r.totalIter,
    hasError: !!r.errorMsg,
  }));

  return (
    <div className="comparison-page">
      <div className="page-header">
        <div className="page-eyebrow">Análisis de Rendimiento</div>
        <h1 className="page-title">
          Comparador de <em>Métodos</em>
        </h1>
        <p className="page-subtitle" style={{ color: "var(--muted)", fontSize: "14px", marginTop: "12px", maxWidth: "600px", lineHeight: "1.6" }}>
          Ejecutá múltiples métodos simultáneamente para la misma función y compará su velocidad de convergencia y estabilidad. En el caso de métodos dependientes de puntos iniciales, el punto A se asignará a x₀ y el punto B a x₁.
        </p>
      </div>

      <div className="comparison-grid">
        {/* Panel de Configuración */}
        <div className="panel config-panel">
          <div className="panel-header">
            <span className="panel-title">Parámetros Globales</span>
          </div>
          <div className="panel-body">
            <div className="field">
              <label>Función f(x)</label>
              <input 
                type="text" 
                value={funcExpr} 
                onChange={(e) => setFuncExpr(e.target.value)}
                placeholder="ej: x^2 - 4"
                onKeyDown={(e) => e.key === "Enter" && handleCompare()}
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label>Punto A (o x₀)</label>
                <input 
                  type="number" 
                  value={pointA} 
                  onChange={(e) => setPointA(e.target.value)}
                  step="any"
                />
              </div>
              <div className="field">
                <label>Punto B (o x₁)</label>
                <input 
                  type="number" 
                  value={pointB} 
                  onChange={(e) => setPointB(e.target.value)}
                  step="any"
                />
              </div>
            </div>

            <div className="field">
              <label>Tolerancia</label>
              <input 
                type="number" 
                value={tolerance} 
                onChange={(e) => setTolerance(e.target.value)}
                step="any"
              />
            </div>

            <button 
              className="btn-primary" 
              style={{ width: "100%", marginTop: "10px" }}
              onClick={handleCompare}
              disabled={loading}
            >
              {loading ? "Analizando..." : "Ejecutar Comparación"}
            </button>
          </div>
        </div>

        {/* Panel de Resultados */}
        <div className="panel results-panel">
          <div className="panel-header">
            <span className="panel-title">Tabla Comparativa</span>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {results.length > 0 ? (
              <div className="table-wrap" style={{ margin: 0, borderRadius: "0 0 14px 14px" }}>
                <table className="iter-table comp-table">
                  <thead>
                    <tr>
                      <th>Método</th>
                      <th>Iteraciones</th>
                      <th>Raíz</th>
                      <th>Error Final</th>
                      <th>Tiempo (ms)</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => {
                      const friendlyInfo = r.errorMsg ? getFriendlyError(r.errorMsg) : null;
                      const isWarning = friendlyInfo?.severity === "warning";

                      return (
                        <tr key={i} className={r.errorMsg ? (isWarning ? "warning-row" : "error-row") : (r.converged ? "converged" : "")}>
                          <td>
                            <strong>{r.name}</strong>
                            <Link to={`/solver/${r.id}`} className="view-link" title="Ir al simulador de este método">
                              ⇗
                            </Link>
                          </td>
                          <td>{r.errorMsg ? "—" : r.totalIter}</td>
                          <td>{r.errorMsg ? "—" : (r.root !== null ? r.root : "No encontrada")}</td>
                          <td>{r.errorMsg ? "—" : (r.finalError !== null ? `${r.finalError}%` : "—")}</td>
                          <td>{r.errorMsg ? "—" : `${r.time} ms`}</td>
                          <td>
                            {r.errorMsg ? (
                              <span
                                className={`status-badge ${isWarning ? "warning" : "error"}`}
                                title={r.errorMsg}
                              >
                                {isWarning ? "Advertencia" : "Error"}
                              </span>
                            ) : r.converged ? (
                              <span className="status-badge success">Convergió</span>
                            ) : (
                              <span className="status-badge warning">Diverge / Máx. Iter</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Mostrar detalles amigables de errores debajo de la tabla */}
                {results.some(r => r.errorMsg) && (
                  <div className="comp-errors-detail">
                    {results.map((r, i) => (
                      r.errorMsg && (
                        <div key={i} className="comp-error-item">
                          <div className="comp-error-method-label">
                            <span className="comp-error-dot" style={{ background: METHOD_COLORS[r.id] || "var(--muted)" }} />
                            {r.name}
                          </div>
                          <FriendlyErrorBox errorMsg={r.errorMsg} compact />
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)", fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase" }}>
                Generá los resultados dando click a "Ejecutar Comparación"
              </div>
            )}
          </div>
        </div>

        {/* ── Gráficos comparativos ── */}
        {results.length > 0 && (
          <div className="comp-charts-row" style={{ gridColumn: "1 / -1" }}>
            {/* Gráfico de Tiempo */}
            <div className="panel comp-chart-panel">
              <div className="panel-header">
                <span className="panel-title">⏱ Tiempo de Ejecución</span>
                <span className="panel-subtitle">milisegundos</span>
              </div>
              <div className="panel-body comp-chart-body">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="shortName"
                      tick={{ fontSize: 10, fill: "var(--muted)", fontFamily: "'DM Mono', monospace" }}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "var(--muted)", fontFamily: "'DM Mono', monospace" }}
                      axisLine={false}
                      tickLine={false}
                      unit=" ms"
                    />
                    <Tooltip content={<TimeTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="time" radius={[6, 6, 0, 0]} maxBarSize={56}>
                      {chartData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.hasError ? "rgba(255,255,255,0.08)" : (METHOD_COLORS[entry.id] || "#888")}
                          stroke={entry.hasError ? "rgba(255,255,255,0.15)" : "none"}
                          strokeWidth={entry.hasError ? 1 : 0}
                          strokeDasharray={entry.hasError ? "4 2" : "0"}
                        />
                      ))}
                      <LabelList
                        dataKey="time"
                        position="top"
                        content={({ x, y, width, index }) => {
                          const d = chartData[index];
                          if (!d) return null;
                          return (
                            <text
                              x={x + width / 2}
                              y={y - 8}
                              textAnchor="middle"
                              fontSize={9}
                              fill="var(--muted)"
                              fontFamily="'DM Mono', monospace"
                            >
                              {d.hasError ? "⚠" : `${d.time} ms`}
                            </text>
                          );
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Leyenda de error */}
                {chartData.some(d => d.hasError) && (
                  <div className="chart-error-legend">
                    <span className="chart-error-legend-icon">⚠</span>
                    <span>Método con error — no se midió</span>
                  </div>
                )}
              </div>
            </div>

            {/* Gráfico de Iteraciones */}
            <div className="panel comp-chart-panel">
              <div className="panel-header">
                <span className="panel-title">🔄 Cantidad de Iteraciones</span>
                <span className="panel-subtitle">iteraciones hasta convergencia</span>
              </div>
              <div className="panel-body comp-chart-body">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="shortName"
                      tick={{ fontSize: 10, fill: "var(--muted)", fontFamily: "'DM Mono', monospace" }}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "var(--muted)", fontFamily: "'DM Mono', monospace" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<IterTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="totalIter" radius={[6, 6, 0, 0]} maxBarSize={56}>
                      {chartData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.hasError ? "rgba(255,255,255,0.08)" : (METHOD_COLORS[entry.id] || "#888")}
                          stroke={entry.hasError ? "rgba(255,255,255,0.15)" : "none"}
                          strokeWidth={entry.hasError ? 1 : 0}
                          strokeDasharray={entry.hasError ? "4 2" : "0"}
                        />
                      ))}
                      <LabelList
                        dataKey="totalIter"
                        position="top"
                        content={({ x, y, width, index }) => {
                          const d = chartData[index];
                          if (!d) return null;
                          return (
                            <text
                              x={x + width / 2}
                              y={y - 8}
                              textAnchor="middle"
                              fontSize={9}
                              fill="var(--muted)"
                              fontFamily="'DM Mono', monospace"
                            >
                              {d.hasError ? "⚠" : d.totalIter}
                            </text>
                          );
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Leyenda de error */}
                {chartData.some(d => d.hasError) && (
                  <div className="chart-error-legend">
                    <span className="chart-error-legend-icon">⚠</span>
                    <span>Método con error — no completó iteraciones</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Insight IA (Ocupa el ancho completo abajo de la configuración) */}
        {results.length > 0 && results.some(r => !r.errorMsg) && (
          <div className="panel ai-panel" style={{ gridColumn: "1 / -1" }}>
            <div className="ai-insight" style={{ marginTop: 0, border: "none", background: "transparent" }}>
              <div className="ai-label">
                <span className="ai-label-icon">✦</span>
                {aiLoading ? "NumérikaAI analizando rendimiento comparado..." : "Insights de Rendimiento"}
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
                  {aiError ? `La IA no está disponible: ${aiError}` : `Se encontraron diferencias de rendimiento. Observá cómo Newton requiere menos iteraciones si f'(x) se comporta bien, mientras que los métodos cerrados son más estables.`}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
