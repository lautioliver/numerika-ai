import { useState, useCallback, useMemo } from "react";
import { MethodTypeTag } from "./MethodTypeTag";
import { FriendlyErrorBox } from "./FriendlyErrorBox";
import {
  solveLinearSystem,
  LINEAR_SYSTEM_EXAMPLES,
} from "../utils/linearSystems";

const ITERATIVE_METHODS = ["jacobi", "gaussseidel"];

function emptyMatrix(n) {
  return Array.from({ length: n }, () => Array(n).fill(""));
}

function emptyVector(n) {
  return Array(n).fill("");
}

function MatrixCell({ value, onChange, highlight }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      className={`linsys-cell ${highlight ? "linsys-cell--b" : ""}`}
      value={value === "" ? "" : value}
      onChange={(e) => {
        const raw = e.target.value;
        // Allow empty, negative sign, decimal point while typing
        if (raw === "" || raw === "-" || raw === "." || raw === "-.") {
          onChange(raw);
          return;
        }
        const num = Number(raw);
        onChange(Number.isNaN(num) ? value : num);
      }}
      placeholder="0"
    />
  );
}

function AugmentedMatrix({ size, matrix, vector, onMatrixChange, onVectorChange }) {
  const colLabels = ["x₁", "x₂", "x₃"].slice(0, size);
  const gridCols = `36px repeat(${size}, minmax(64px, 1fr)) 20px minmax(72px, 1fr)`;
  return (
    <div className="linsys-matrix-block">
      <div className="linsys-matrix-col-labels" style={{ gridTemplateColumns: gridCols }}>
        <span className="linsys-row-label" />
        {colLabels.map((l) => (
          <span key={l} className="linsys-col-label">{l}</span>
        ))}
        <span className="linsys-eq" />
        <span className="linsys-col-label linsys-col-label--b">b</span>
      </div>
      {matrix.map((row, i) => (
        <div key={i} className="linsys-matrix-row" style={{ gridTemplateColumns: gridCols }}>
          <span className="linsys-row-label">F{i + 1}</span>
          {row.map((cell, j) => (
            <MatrixCell
              key={j}
              value={cell}
              onChange={(v) => onMatrixChange(i, j, v)}
            />
          ))}
          <span className="linsys-eq">=</span>
          <MatrixCell
            value={vector[i]}
            onChange={(v) => onVectorChange(i, v)}
            highlight
          />
        </div>
      ))}
    </div>
  );
}

function StepMatrixTable({ matrix }) {
  if (!matrix?.length) return null;
  const cols = matrix[0].length;
  return (
    <div className="linsys-step-matrix-wrap">
      <table className="linsys-step-matrix">
        <tbody>
          {matrix.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className={ci === cols - 1 ? "linsys-step-augment" : ""}>
                  {typeof cell === "number" ? Number(cell.toFixed(4)) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LinearSystemSolver({ methodId, methodName, methodType }) {
  const isIterative = ITERATIVE_METHODS.includes(methodId);
  const maxSize = methodId === "cramer" ? 3 : 3;

  const [size, setSize] = useState(2);
  const [matrix, setMatrix] = useState(emptyMatrix(2));
  const [vector, setVector] = useState(emptyVector(2));
  const [x0, setX0] = useState(emptyVector(2));
  const [tolerance, setTolerance] = useState("0.0001");
  const [maxIter, setMaxIter] = useState("100");

  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const resizeSystem = useCallback((n) => {
    setSize(n);
    setMatrix((prev) => {
      const next = emptyMatrix(n);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          next[i][j] = prev[i]?.[j] ?? 0;
        }
      }
      return next;
    });
    setVector((prev) => {
      const next = emptyVector(n);
      for (let i = 0; i < n; i++) next[i] = prev[i] ?? 0;
      return next;
    });
    setX0(emptyVector(n));
    setResult(null);
    setError(null);
  }, []);

  const handleMatrixChange = (r, c, val) => {
    setMatrix((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = val === "" ? "" : val;
      return next;
    });
  };

  const handleVectorChange = (i, val) => {
    setVector((prev) => {
      const next = [...prev];
      next[i] = val === "" ? "" : val;
      return next;
    });
  };

  const loadExample = () => {
    const ex = LINEAR_SYSTEM_EXAMPLES[size];
    if (!ex) return;
    setMatrix(ex.A.map((row) => [...row]));
    setVector([...ex.b]);
    setResult(null);
    setError(null);
  };

  const parseNumericSystem = () => {
    const A = matrix.map((row) =>
      row.map((v) => {
        const n = typeof v === "number" ? v : parseFloat(v);
        return Number.isFinite(n) ? n : NaN;
      })
    );
    const b = vector.map((v) => {
      const n = typeof v === "number" ? v : parseFloat(v);
      return Number.isFinite(n) ? n : NaN;
    });
    const x0parsed = x0.map((v) => {
      const n = typeof v === "number" ? v : parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    });
    return { A, b, x0: x0parsed };
  };

  const handleCalculate = () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { A, b, x0: x0parsed } = parseNumericSystem();
      const tol = parseFloat(tolerance);
      const maxI = parseInt(maxIter, 10);

      if (isIterative && (isNaN(tol) || tol <= 0)) {
        setError("La tolerancia debe ser un número positivo.");
        setLoading(false);
        return;
      }
      if (isIterative && (isNaN(maxI) || maxI < 1)) {
        setError("El máximo de iteraciones debe ser al menos 1.");
        setLoading(false);
        return;
      }

      const res = solveLinearSystem(methodId, A, b, {
        tolerancia: tol,
        maxIter: maxI,
        x0: x0parsed,
      });

      if (!res.success) {
        setError(res.error);
        setLoading(false);
        return;
      }

      setResult(res);
    } catch (err) {
      setError(err.message || "Error al resolver el sistema.");
    } finally {
      setLoading(false);
    }
  };

  const varLabels = useMemo(
    () => Array.from({ length: size }, (_, i) => `x${i + 1}`),
    [size]
  );

  return (
    <div className="solver-grid linsys-page fade-up-2">
      <div className="panel" id="linsys-input-panel">
        <div className="panel-header">
          <span className="panel-title">Sistema Ax = b</span>
          <MethodTypeTag type={methodType} />
        </div>
        <div className="panel-body">
          <div className="field">
            <label>Tamaño del sistema</label>
            <div className="linsys-size-tabs">
              {[2, 3].filter((n) => n <= maxSize).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`linsys-size-btn ${size === n ? "active" : ""}`}
                  onClick={() => resizeSystem(n)}
                >
                  {n}×{n}
                </button>
              ))}
            </div>
            {methodId === "cramer" && (
              <small>Cramer: máximo 3×3 (det(A) ≠ 0)</small>
            )}
          </div>

          <AugmentedMatrix
            size={size}
            matrix={matrix}
            vector={vector}
            onMatrixChange={handleMatrixChange}
            onVectorChange={handleVectorChange}
          />

          {isIterative && (
            <>
              <div className="field">
                <label>Vector inicial x⁽⁰⁾</label>
                <div className="field-row">
                  {varLabels.map((label, i) => (
                    <div key={label}>
                      <label>{label}</label>
                      <input
                        type="number"
                        value={x0[i] === "" ? "" : x0[i]}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setX0((prev) => {
                            const next = [...prev];
                            next[i] = raw === "" ? "" : Number(raw);
                            return next;
                          });
                        }}
                        step="any"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Tolerancia</label>
                  <input
                    type="text"
                    value={tolerance}
                    onChange={(e) => setTolerance(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Máx. iteraciones</label>
                  <input
                    type="text"
                    value={maxIter}
                    onChange={(e) => setMaxIter(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="calc-examples linsys-examples">
            <span className="calc-examples-label">Ejemplo</span>
            <button type="button" className="calc-example-chip" onClick={loadExample}>
              {LINEAR_SYSTEM_EXAMPLES[size]?.label || "Cargar ejemplo"}
            </button>
          </div>

          <div className="divider"><span>listo</span></div>

          <button
            type="button"
            className="btn-run"
            onClick={handleCalculate}
            disabled={loading}
            id="linsys-calc-btn"
          >
            {loading ? "Calculando..." : "Resolver sistema"}
          </button>

          {error && <FriendlyErrorBox errorMsg={error} />}
        </div>
      </div>

      <div className="panel" id="linsys-result-panel">
        <div className="panel-header">
          <span className="panel-title">Resultado</span>
          {result?.totalIter != null && (
            <span style={{ fontSize: "9px", color: "var(--muted)", letterSpacing: "1px" }}>
              {result.totalIter} iter.
            </span>
          )}
        </div>
        <div className="panel-body">
          {!result ? (
            <div className="result-placeholder">
              <span style={{ fontSize: 28, opacity: 0.35 }}>⎡⎤</span>
              <p>Completá [A] y [b], luego presioná Resolver</p>
            </div>
          ) : (
            <div className="fade-up">
              <div
                className="status-bar"
                style={{
                  background: (result.converged !== false)
                    ? "rgba(108,189,181,0.1)"
                    : "rgba(255,180,100,0.1)",
                  borderColor: (result.converged !== false)
                    ? "rgba(108,189,181,0.3)"
                    : "rgba(255,150,50,0.3)",
                }}
              >
                <div
                  className="status-dot"
                  style={{
                    background:
                      result.converged === false ? "#ff9933" : "var(--teal)",
                  }}
                />
                <span
                  className="status-text"
                  style={{
                    color: result.converged === false ? "#ff9933" : "var(--teal)",
                  }}
                >
                  {isIterative
                    ? result.converged
                      ? `Convergió en ${result.totalIter} iteraciones`
                      : `Sin convergencia tras ${result.totalIter} iteraciones`
                    : `Solución única — ${methodName}`}
                </span>
              </div>

              {result.warnings?.map((w, i) => (
                <div key={i} className="linsys-warning">
                  {w}
                </div>
              ))}

              <div className="linsys-solution-grid">
                {result.solution.map((val, i) => (
                  <div key={i} className="linsys-solution-card">
                    <span className="linsys-solution-var">{varLabels[i]}</span>
                    <span className="linsys-solution-val">{val}</span>
                  </div>
                ))}
              </div>

              {result.detA != null && (
                <p className="linsys-meta">
                  <span className="math-meta-tag">det(A) = {result.detA}</span>
                </p>
              )}

              {result.cramerDetails?.length > 0 && (
                <div className="table-wrap">
                  <table className="iter-table">
                    <thead>
                      <tr>
                        <th>Incógnita</th>
                        <th>Fórmula</th>
                        <th>det(Aᵢ)</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.cramerDetails.map((row) => (
                        <tr key={row.variable}>
                          <td>{row.variable}</td>
                          <td>{row.formula}</td>
                          <td>{row.detAi}</td>
                          <td>
                            {result.solution[
                              parseInt(row.variable.replace("x", ""), 10) - 1
                            ]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {result.steps?.length > 0 && (
                <div className="linsys-steps">
                  <span className="linsys-steps-title">Procedimiento</span>
                  {result.steps.map((step, idx) => (
                    <div key={idx} className="linsys-step-card">
                      <span className="linsys-step-label">{step.label}</span>
                      {step.matrix && <StepMatrixTable matrix={step.matrix} />}
                      {step.value != null && !step.matrix && (
                        <span className="linsys-step-value">= {step.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {result.iterations?.length > 0 && (
                <div className="table-wrap">
                  <table className="iter-table">
                    <thead>
                      <tr>
                        <th>k</th>
                        {varLabels.map((l) => (
                          <th key={l}>{l}</th>
                        ))}
                        <th>‖Δx‖∞</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.iterations.map((row) => (
                        <tr key={row.iteracion}>
                          <td>{row.iteracion}</td>
                          {row.valores.map((v, j) => (
                            <td key={j}>{v}</td>
                          ))}
                          <td>{row.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
