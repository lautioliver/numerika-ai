import React from "react";
import { METHODS, MOCK_ROWS } from "../constants/data";
import { MethodTypeTag } from "../components/MethodTypeTag";
import { MockGraph } from "../components/MockGraph";

export const SolverPage = ({ activeMethod, calculated, onCalculate }) => {
  const selected = METHODS.find((m) => m.id === activeMethod);
  const handleMethodChange = (methodId) => {
    // Este evento se manejará desde el componente padre
    window.dispatchEvent(
      new CustomEvent("methodChange", { detail: { methodId } })
    );
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
              <input type="text" defaultValue="x² – x – 2" />
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
                  <input type="text" placeholder="a = 1" />
                  <input type="text" placeholder="b = 3" />
                </div>
              </div>
            )}
            {selected?.type === "abierto" && (
              <div className="field">
                <label>Punto inicial x₀</label>
                <input type="text" placeholder="x₀ = 1.5" />
              </div>
            )}

            <div className="field">
              <label>Tolerancia</label>
              <input type="text" defaultValue="0.001" />
            </div>

            <div className="divider">
              <span>listo</span>
            </div>
            <button className="btn-run" onClick={onCalculate}>
              Calcular
            </button>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Resultado</span>
            {calculated && (
              <span style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px" }}>
                4 iteraciones
              </span>
            )}
          </div>
          <div className="panel-body">
            {!calculated ? (
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
                <div className="status-bar">
                  <div className="status-dot" />
                  <span className="status-text">Convergencia · raíz ≈ 2.3750</span>
                </div>
                <div className="graph-area">
                  <span className="graph-label">f(x) = x² – x – 2</span>
                  <MockGraph />
                </div>
                <table className="iter-table">
                  <thead>
                    <tr>
                      <th>n</th>
                      <th>a</th>
                      <th>b</th>
                      <th>c</th>
                      <th>f(c)</th>
                      <th>err</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_ROWS.map((r) => (
                      <tr key={r.n} className={r.converged ? "converged" : ""}>
                        <td>{r.n}</td>
                        <td>{r.a}</td>
                        <td>{r.b}</td>
                        <td>{r.c}</td>
                        <td>{r.fc}</td>
                        <td>{r.err}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="ai-insight">
                  <div className="ai-label">Explicación IA</div>
                  <p className="ai-text">
                    El método de bisección dividió [1, 3] a la mitad en cada paso. La raíz exacta
                    es x = 2, y en 4 iteraciones se acotó el error al 5.26%. Convergencia
                    garantizada por el Teorema de Bolzano.
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
