import React, { useState, useRef } from "react";
import { METHODS } from "../constants/data";
import { MethodTypeTag } from "../components/MethodTypeTag";
import { MockGraph } from "../components/MockGraph";
import {
  biseccion,
  reglaFalsa,
  newtonRaphson,
  secante,
  puntoFijo,
} from "../utils/numericalMethods";

export const SolverPage = ({ activeMethod, setActiveMethod, calculated, onCalculate }) => {
  const selected = METHODS.find((m) => m.id === activeMethod);

  // Estado para capturar inputs
  const [funcExpr, setFuncExpr] = useState("x^2 - x - 2");
  const [aValue, setAValue] = useState("1");
  const [bValue, setBValue] = useState("3");
  const [x0Value, setX0Value] = useState("1.5");
  const [x1Value, setX1Value] = useState("2.5");
  const [tolerance, setTolerance] = useState("0.001");
  
  // Estado para resultados
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleMethodChange = (methodId) => {
    setActiveMethod(methodId);
    setResult(null);
    setError(null);
  };

  const handleCalculate = async () => {
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

      // Ejecutar método según selección
      switch (activeMethod) {
        case "biseccion":
          res = biseccion(funcExpr, aValue, bValue, tol);
          break;
        case "reglafalsa":
          res = reglaFalsa(funcExpr, aValue, bValue, tol);
          break;
        case "newton":
          res = newtonRaphson(funcExpr, x0Value, tol);
          break;
        case "secante":
          res = secante(funcExpr, x0Value, x1Value, tol);
          break;
        case "puntofijo":
          res = puntoFijo(funcExpr, x0Value, tol);
          break;
        default:
          setError("Método no seleccionado.");
          break;
      }

      if (res.error) {
        setError(res.error);
      } else {
        setResult(res);
        onCalculate();
      }
    } catch (err) {
      setError("Error durante el cálculo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="solver fade-up">
      <div className="page-header">
        <div className="page-eyebrow">Solver</div>
        <h2 className="page-title">Calculá paso a paso</h2>
      </div>

      <div className="solver-grid">
        {/* LEFT PANEL */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Configuración</span>
            <MethodTypeTag type={selected?.type} />
          </div>
          <div className="panel-body">
            <div className="field">
              <label>Función f(x)</label>
              <input
                type="text"
                value={funcExpr}
                onChange={(e) => setFuncExpr(e.target.value)}
                placeholder="Ej: x^2 - x - 2"
              />
              <small style={{ color: "var(--muted)", fontSize: "8px", marginTop: "4px" }}>
                Usá: ^ (potencia), sqrt, sin, cos, tan, ln, exp, pi
              </small>
            </div>

            <div className="field">
              <label>Método</label>
              <div className="method-grid">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    className={`method-pill ${activeMethod === m.id ? "active" : ""}`}
                    onClick={() => handleMethodChange(m.id)}
                  >
                    <span className="pill-name">{m.name}</span>
                    <span className="pill-type">{m.type}</span>
                  </button>
                ))}
              </div>
            </div>

            {selected?.type === "cerrado" && (
              <div className="field">
                <label>Intervalo [a, b]</label>
                <div className="field-row">
                  <input
                    type="text"
                    value={aValue}
                    onChange={(e) => setAValue(e.target.value)}
                    placeholder="a"
                  />
                  <input
                    type="text"
                    value={bValue}
                    onChange={(e) => setBValue(e.target.value)}
                    placeholder="b"
                  />
                </div>
              </div>
            )}
            {selected?.type === "abierto" && (
              <div className="field">
                <label>Punto(s) inicial(es)</label>
                <input
                  type="text"
                  value={x0Value}
                  onChange={(e) => setX0Value(e.target.value)}
                  placeholder="x₀"
                />
                {(activeMethod === "secante" || activeMethod === "puntofijo") && (
                  <input
                    type="text"
                    value={x1Value}
                    onChange={(e) => setX1Value(e.target.value)}
                    placeholder="x₁ (solo Secante)"
                    style={{ marginTop: "8px" }}
                  />
                )}
              </div>
            )}

            <div className="field">
              <label>Tolerancia</label>
              <input
                type="text"
                value={tolerance}
                onChange={(e) => setTolerance(e.target.value)}
                placeholder="0.001"
              />
            </div>

            <div className="divider">
              <span>listo</span>
            </div>
            <button
              className="btn-run"
              onClick={handleCalculate}
              disabled={loading}
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Calculando..." : "Calcular"}
            </button>

            {error && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px",
                  background: "rgba(255, 200, 200, 0.2)",
                  border: "1px solid rgba(255, 100, 100, 0.5)",
                  borderRadius: "6px",
                  color: "#c41e3a",
                  fontSize: "10px",
                }}
              >
                ⚠ {error}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Resultado</span>
            {result && (
              <span style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px" }}>
                {result.totalIter} iteración{result.totalIter !== 1 ? "es" : ""}
              </span>
            )}
          </div>
          <div className="panel-body">
            {!result ? (
              <div className="result-placeholder">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                <p>Configurá y calculá</p>
              </div>
            ) : (
              <div className="fade-up">
                <div
                  className="status-bar"
                  style={{
                    background: result.converged
                      ? "rgba(108,189,181,0.1)"
                      : "rgba(255, 180, 100, 0.1)",
                    borderColor: result.converged
                      ? "rgba(108,189,181,0.3)"
                      : "rgba(255, 150, 50, 0.3)",
                  }}
                >
                  <div
                    className="status-dot"
                    style={{
                      background: result.converged ? "var(--teal)" : "#ff9933",
                    }}
                  />
                  <span
                    className="status-text"
                    style={{
                      color: result.converged ? "var(--teal)" : "#ff9933",
                    }}
                  >
                    {result.converged ? "Convergencia" : "No convergió"}
                    {result.root !== null && ` · raíz ≈ ${result.root}`}
                  </span>
                </div>

                <div className="graph-area">
                  <span className="graph-label">f(x) = {funcExpr}</span>
                  <MockGraph />
                </div>

                <table className="iter-table">
                  <thead>
                    <tr>
                      {activeMethod === "newton" && (
                        <>
                          <th>n</th>
                          <th>x</th>
                          <th>f(x)</th>
                          <th>f'(x)</th>
                          <th>x₁</th>
                          <th>err (%)</th>
                        </>
                      )}
                      {activeMethod === "secante" && (
                        <>
                          <th>n</th>
                          <th>x₀</th>
                          <th>x₁</th>
                          <th>x₂</th>
                          <th>f(x₂)</th>
                          <th>err (%)</th>
                        </>
                      )}
                      {activeMethod === "puntofijo" && (
                        <>
                          <th>n</th>
                          <th>x</th>
                          <th>g(x)</th>
                          <th>err (%)</th>
                        </>
                      )}
                      {(activeMethod === "biseccion" || activeMethod === "reglafalsa") && (
                        <>
                          <th>n</th>
                          <th>a</th>
                          <th>b</th>
                          <th>c</th>
                          <th>f(c)</th>
                          <th>err (%)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {result.iterations.map((row, idx) => (
                      <tr key={idx} className={row.converged ? "converged" : ""}>
                        {activeMethod === "newton" && (
                          <>
                            <td>{row.n}</td>
                            <td>{row.x}</td>
                            <td>{row.fx}</td>
                            <td>{row.fpx}</td>
                            <td>{row.x1}</td>
                            <td>{row.err}</td>
                          </>
                        )}
                        {activeMethod === "secante" && (
                          <>
                            <td>{row.n}</td>
                            <td>{row.x0}</td>
                            <td>{row.x1}</td>
                            <td>{row.x2}</td>
                            <td>{row.fx2}</td>
                            <td>{row.err}</td>
                          </>
                        )}
                        {activeMethod === "puntofijo" && (
                          <>
                            <td>{row.n}</td>
                            <td>{row.x}</td>
                            <td>{row.gx}</td>
                            <td>{row.err}</td>
                          </>
                        )}
                        {(activeMethod === "biseccion" || activeMethod === "reglafalsa") && (
                          <>
                            <td>{row.n}</td>
                            <td>{row.a}</td>
                            <td>{row.b}</td>
                            <td>{row.c}</td>
                            <td>{row.fc}</td>
                            <td>{row.err}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="ai-insight">
                  <div className="ai-label">
                    {result.converged ? "✓ Convergencia alcanzada" : "⚠ No convergió"}
                  </div>
                  <p className="ai-text">
                    {result.converged
                      ? `El método ${selected.name} convergió en ${result.totalIter} iteración${result.totalIter !== 1 ? "es" : ""} a la raíz x = ${result.root}. La tolerancia fue satisfecha dentro de los parámetros especificados.`
                      : `El método alcanzó el máximo de iteraciones (${result.totalIter}) sin converger. Intentá ajustar los parámetros iniciales o la tolerancia.`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
