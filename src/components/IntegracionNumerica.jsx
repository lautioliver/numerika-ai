import { useState, useCallback, useMemo } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { trapecio, simpson13, simpson38 } from "../utils/numericalMethods";
import { FriendlyErrorBox } from "./FriendlyErrorBox";

const METHODS = [
  {
    id: "trapecio",
    name: "Trapecio",
    type: "O(h²) — compuesto",
    rule: "n ≥ 1",
  },
  {
    id: "simpson13",
    name: "Simpson 1/3",
    type: "O(h⁴) — n par",
    rule: "n debe ser par",
  },
  {
    id: "simpson38",
    name: "Simpson 3/8",
    type: "O(h⁴) — n múltiplo de 3",
    rule: "n debe ser múltiplo de 3",
  },
];

const EXAMPLES = [
  { label: "∫₀¹ x² dx = 1/3", expr: "x^2", a: "0", b: "1", n: "6" },
  { label: "∫₀^π sin(x) dx = 2", expr: "sin(x)", a: "0", b: "pi", n: "6" },
  { label: "∫₁² 1/x dx = ln 2", expr: "1/x", a: "1", b: "2", n: "6" },
  { label: "∫₀² e^(-x²) dx", expr: "exp(-x^2)", a: "0", b: "2", n: "6" },
];

function defaultNFor(methodId) {
  if (methodId === "simpson13") return "6";
  if (methodId === "simpson38") return "6";
  return "8";
}

function adjustN(methodId, rawN) {
  const n = parseInt(rawN, 10);
  if (!Number.isFinite(n) || n < 1) return rawN;
  if (methodId === "simpson13" && n % 2 !== 0) return String(n + 1);
  if (methodId === "simpson38" && n % 3 !== 0) return String(n + (3 - (n % 3)));
  return String(n);
}

const GraphTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="graph-tooltip">
      <div className="graph-tooltip-row">
        <span className="graph-tooltip-label">x =</span>
        <span className="graph-tooltip-value">{Number(point.x).toFixed(4)}</span>
      </div>
      <div className="graph-tooltip-row">
        <span className="graph-tooltip-label">f(x) =</span>
        <span className="graph-tooltip-value">
          {point.y == null ? "∞" : Number(point.y).toFixed(6)}
        </span>
      </div>
    </div>
  );
};

export function IntegracionNumerica() {
  const [method, setMethod] = useState("trapecio");
  const [expr, setExpr] = useState("x^2");
  const [a, setA] = useState("0");
  const [b, setB] = useState("1");
  const [n, setN] = useState("8");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleMethodChange = (id) => {
    setMethod(id);
    setN((prev) => adjustN(id, prev) || defaultNFor(id));
    setResult(null);
    setError(null);
  };

  const loadExample = (ex) => {
    setExpr(ex.expr);
    setA(ex.a);
    setB(ex.b);
    setN(adjustN(method, ex.n));
    setResult(null);
    setError(null);
  };

  const handleCalculate = useCallback(() => {
    setLoading(true);
    setError(null);
    setResult(null);

    requestAnimationFrame(() => {
      try {
        let res;
        if (method === "simpson13") res = simpson13(expr, a, b, n);
        else if (method === "simpson38") res = simpson38(expr, a, b, n);
        else res = trapecio(expr, a, b, n);

        if (res.error) setError(res.error);
        else setResult(res);
      } catch (e) {
        setError(e.message || "Error al calcular la integral.");
      } finally {
        setLoading(false);
      }
    });
  }, [method, expr, a, b, n]);

  // ─── Datos para Recharts ──────────────────────────────────────────────
  // Mezclamos la curva continua + los nodos para sombrear el área
  const chartData = useMemo(() => {
    if (!result?.curvePoints?.length) return [];
    return result.curvePoints.map((p) => ({ x: p.x, y: p.y, area: p.y }));
  }, [result]);

  const nodeData = useMemo(
    () => result?.nodePoints?.map((p) => ({ x: p.x, y: p.y, role: p.role })) ?? [],
    [result]
  );

  // Mezcla curva + nodos preservando orden por x
  const fullChartData = useMemo(() => {
    const map = new Map();
    chartData.forEach((p) => {
      map.set(Number(p.x).toFixed(6), { x: p.x, y: p.y, area: p.y });
    });
    nodeData.forEach((p) => {
      const key = Number(p.x).toFixed(6);
      const existing = map.get(key);
      map.set(key, {
        x: p.x,
        y: existing?.y ?? p.y,
        area: existing?.area ?? p.y,
        node: p.y,
        role: p.role,
      });
    });
    return [...map.values()].sort((a, b) => Number(a.x) - Number(b.x));
  }, [chartData, nodeData]);

  const yAxisDomain = useMemo(() => {
    if (!chartData.length) return ["auto", "auto"];
    const ys = chartData
      .map((p) => Number(p.y))
      .filter((v) => Number.isFinite(v));
    if (!ys.length) return ["auto", "auto"];
    let yMin = Math.min(0, ...ys);
    let yMax = Math.max(0, ...ys);
    const pad = (yMax - yMin) * 0.12 || 1;
    return [yMin - pad, yMax + pad];
  }, [chartData]);

  const isSimpson13 = method === "simpson13";
  const isSimpson38 = method === "simpson38";

  return (
    <div className="solver-grid fade-up-2 intnum-page">
      {/* ── Panel Izquierdo: Configuración ── */}
      <div className="panel" id="intnum-input-panel">
        <div className="panel-header">
          <span className="panel-title">Configuración</span>
        </div>
        <div className="panel-body">
          <div className="method-tabs intnum-method-tabs">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`method-tab ${method === m.id ? "active" : ""}`}
                onClick={() => handleMethodChange(m.id)}
                id={`intnum-method-${m.id}`}
              >
                <span className="tab-name">{m.name}</span>
                <span className="tab-type">{m.type}</span>
              </button>
            ))}
          </div>

          <div className="field">
            <label htmlFor="intnum-expr">f(x)</label>
            <input
              id="intnum-expr"
              type="text"
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              placeholder="x^2 · sin(x) · 1/x"
              spellCheck={false}
            />
            <small>^ potencia · * multiplicar · usá pi, e como constantes</small>
          </div>

          <div className="field">
            <label>Intervalo de integración</label>
            <div className="field-row">
              <div className="field">
                <label htmlFor="intnum-a">a (inferior)</label>
                <input
                  id="intnum-a"
                  type="text"
                  value={a}
                  onChange={(e) => setA(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="field">
                <label htmlFor="intnum-b">b (superior)</label>
                <input
                  id="intnum-b"
                  type="text"
                  value={b}
                  onChange={(e) => setB(e.target.value)}
                  placeholder="1"
                />
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="intnum-n">Subintervalos (n)</label>
            <input
              id="intnum-n"
              type="number"
              min="1"
              step={isSimpson38 ? 3 : isSimpson13 ? 2 : 1}
              value={n}
              onChange={(e) => setN(e.target.value)}
              onBlur={(e) => setN(adjustN(method, e.target.value))}
            />
            <small>
              {isSimpson13
                ? "Simpson 1/3 requiere n par (2, 4, 6, …)."
                : isSimpson38
                ? "Simpson 3/8 requiere n múltiplo de 3 (3, 6, 9, …)."
                : "Cualquier entero positivo. Más subintervalos → mejor aproximación."}
            </small>
          </div>

          <button
            type="button"
            className="btn-run intnum-submit"
            onClick={handleCalculate}
            disabled={loading || !expr.trim()}
            id="intnum-calc-btn"
          >
            {loading ? "Calculando..." : "Calcular integral"}
          </button>

          {error && <FriendlyErrorBox errorMsg={error} />}

          <div className="calc-examples intnum-examples">
            <span className="calc-examples-label">Ejemplos</span>
            <div className="calc-examples-list">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  className="calc-example-chip"
                  onClick={() => loadExample(ex)}
                  title={`${ex.expr} en [${ex.a}, ${ex.b}]`}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Panel Derecho: Resultado ── */}
      <div className="panel" id="intnum-result-panel">
        <div className="panel-header">
          <span className="panel-title">Resultado</span>
          {result && (
            <span style={{ fontSize: "9px", color: "var(--muted)", letterSpacing: "1px" }}>
              {result.iterations.length} {result.iterations.length === 1 ? "panel" : "paneles"}
            </span>
          )}
        </div>
        <div className="panel-body">
          {!result ? (
            <div className="result-placeholder">
              <span style={{ fontSize: 32, opacity: 0.3 }}>∫</span>
              <p>Ingresá f(x) y los límites, luego presioná Calcular</p>
            </div>
          ) : (
            <div className="fade-up">
              {/* Status / valor de la integral */}
              <div
                className="status-bar intnum-status"
                style={{
                  background: "rgba(108,189,181,0.1)",
                  borderColor: "rgba(108,189,181,0.3)",
                }}
              >
                <div className="status-dot" style={{ background: "var(--teal)" }} />
                <span className="status-text" style={{ color: "var(--teal)" }}>
                  {result.methodLabel} · I ≈ {result.integral}
                </span>
              </div>

              <div className="intnum-summary-grid">
                <div className="intnum-summary-card">
                  <span className="intnum-summary-label">f(x)</span>
                  <span className="intnum-summary-val intnum-mono">{result.expression}</span>
                </div>
                <div className="intnum-summary-card">
                  <span className="intnum-summary-label">Intervalo</span>
                  <span className="intnum-summary-val intnum-mono">[{result.a}, {result.b}]</span>
                </div>
                <div className="intnum-summary-card">
                  <span className="intnum-summary-label">n · h</span>
                  <span className="intnum-summary-val intnum-mono">{result.n} · {result.h}</span>
                </div>
                <div className="intnum-summary-card intnum-summary-card--highlight">
                  <span className="intnum-summary-label">I ≈</span>
                  <span className="intnum-summary-val intnum-mono">{result.integral}</span>
                </div>
              </div>

              <div className="intnum-formula">
                <span className="intnum-formula-label">Fórmula</span>
                <code>{result.summary.formula}</code>
              </div>

              {/* Gráfico */}
              <div className="graph-container intnum-graph">
                <div className="graph-header">
                  <span className="graph-label">f(x) y área aproximada</span>
                  <span className="math-meta-tag">{result.order}</span>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart
                    data={fullChartData}
                    margin={{ top: 12, right: 24, left: 8, bottom: 16 }}
                  >
                    <defs>
                      <linearGradient id="intnum-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--teal)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--teal)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="x"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      tick={{
                        fontSize: 10,
                        fill: "var(--muted)",
                        fontFamily: "'DM Mono', monospace",
                      }}
                      label={{
                        value: "x",
                        position: "insideBottomRight",
                        offset: -4,
                        fontSize: 11,
                        fill: "var(--muted)",
                      }}
                    />
                    <YAxis
                      domain={yAxisDomain}
                      tick={{
                        fontSize: 10,
                        fill: "var(--muted)",
                        fontFamily: "'DM Mono', monospace",
                      }}
                      label={{
                        value: "f(x)",
                        angle: -90,
                        position: "insideLeft",
                        offset: 8,
                        fontSize: 11,
                        fill: "var(--muted)",
                      }}
                    />
                    <Tooltip content={<GraphTooltip />} />
                    <ReferenceLine y={0} stroke="var(--muted)" strokeWidth={1} />
                    <Area
                      type="monotone"
                      dataKey="area"
                      stroke="none"
                      fill="url(#intnum-area)"
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="y"
                      stroke="var(--teal)"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="node"
                      stroke="transparent"
                      dot={{
                        r: 3.5,
                        stroke: "var(--teal)",
                        strokeWidth: 1.5,
                        fill: "var(--surface)",
                      }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Tabla de paneles */}
              <div className="table-wrap intnum-table-wrap">
                <table className="iter-table intnum-table">
                  <thead>
                    {method === "trapecio" && (
                      <tr>
                        <th>i</th>
                        <th>x<sub>i-1</sub></th>
                        <th>x<sub>i</sub></th>
                        <th>f(x<sub>i-1</sub>)</th>
                        <th>f(x<sub>i</sub>)</th>
                        <th>Área panel</th>
                      </tr>
                    )}
                    {method === "simpson13" && (
                      <tr>
                        <th>panel</th>
                        <th>x<sub>0</sub></th>
                        <th>x<sub>1</sub></th>
                        <th>x<sub>2</sub></th>
                        <th>f<sub>0</sub></th>
                        <th>f<sub>1</sub></th>
                        <th>f<sub>2</sub></th>
                        <th>Área panel</th>
                      </tr>
                    )}
                    {method === "simpson38" && (
                      <tr>
                        <th>panel</th>
                        <th>x<sub>0</sub></th>
                        <th>x<sub>1</sub></th>
                        <th>x<sub>2</sub></th>
                        <th>x<sub>3</sub></th>
                        <th>f<sub>0</sub></th>
                        <th>f<sub>1</sub></th>
                        <th>f<sub>2</sub></th>
                        <th>f<sub>3</sub></th>
                        <th>Área panel</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {result.iterations.map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.i}</td>
                        {method === "trapecio" && (
                          <>
                            <td>{row.xLeft}</td>
                            <td>{row.xRight}</td>
                            <td>{row.fLeft}</td>
                            <td>{row.fRight}</td>
                            <td>{row.subarea}</td>
                          </>
                        )}
                        {method === "simpson13" && (
                          <>
                            <td>{row.xLeft}</td>
                            <td>{row.xMid}</td>
                            <td>{row.xRight}</td>
                            <td>{row.fLeft}</td>
                            <td>{row.fMid}</td>
                            <td>{row.fRight}</td>
                            <td>{row.subarea}</td>
                          </>
                        )}
                        {method === "simpson38" && (
                          <>
                            <td>{row.x0}</td>
                            <td>{row.x1}</td>
                            <td>{row.x2}</td>
                            <td>{row.x3}</td>
                            <td>{row.f0}</td>
                            <td>{row.f1}</td>
                            <td>{row.f2}</td>
                            <td>{row.f3}</td>
                            <td>{row.subarea}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
