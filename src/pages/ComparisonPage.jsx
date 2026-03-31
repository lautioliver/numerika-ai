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

  const API_URL = import.meta.env.VITE_API_URL;

  const handleCompare = () => {
    setLoading(true);
    setResults([]);
    setAiExplanation(null);
    setAiError(null);

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
      const res = await fetch(`${API_URL}/api/ai/explain`, {
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
            totalIter: validResults.map(r => r.totalIter).reduce((a,b)=>a+b,0), // Dummy para que no falle el server
            summary: resultSummary // Pasamos el resumen detallado en una propiedad extra (gemini igual lo leerá al serializar)
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

  // Se removió el auto-compare inicial para evitar agotar la cuota (rate-limit) 
  // de la API de Gemini (15 peticiones por minuto) cada vez que el usuario navega a esta página.

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
                    {results.map((r, i) => (
                      <tr key={i} className={r.errorMsg ? "error-row" : (r.converged ? "converged" : "")}>
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
                            <span className="status-badge error" title={r.errorMsg}>Error</span>
                          ) : r.converged ? (
                            <span className="status-badge success">Convergió</span>
                          ) : (
                            <span className="status-badge warning">Diverge / Máx. Iter</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)", fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase" }}>
                Generá los resultados dando click a "Ejecutar Comparación"
              </div>
            )}
          </div>
        </div>

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
