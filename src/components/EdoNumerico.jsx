import { useState, useCallback, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { edoEuler, edoRK4 } from "../utils/numericalMethods";
import { FriendlyErrorBox } from "./FriendlyErrorBox";
import { Plot3DModal } from "./Plot3DModal";
import { Plot3DTrigger } from "./Plot3DTrigger";
import { can3D } from "../utils/edoPlot3D";

const METHODS = [
  { id: "euler", name: "Euler", type: "O(h) — primer orden" },
  { id: "rk4", name: "Runge-Kutta 4", type: "O(h⁴) — cuarto orden" },
];

const EXAMPLES = [
  { label: "Crecimiento y'=y", rhs: "y", t0: "0", y0: "1", h: "0.1", tFinal: "2" },
  { label: "Decaimiento", rhs: "-y", t0: "0", y0: "1", h: "0.1", tFinal: "3" },
  { label: "y' = t + y", rhs: "t + y", t0: "0", y0: "1", h: "0.05", tFinal: "1" },
  { label: "Oscilador suave", rhs: "-y + sin(t)", t0: "0", y0: "0", h: "0.1", tFinal: "10" },
];

const GraphTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { t, y } = payload[0].payload;
  return (
    <div className="graph-tooltip">
      <div className="graph-tooltip-row">
        <span className="graph-tooltip-label">t =</span>
        <span className="graph-tooltip-value">{Number(t).toFixed(4)}</span>
      </div>
      <div className="graph-tooltip-row">
        <span className="graph-tooltip-label">y =</span>
        <span className="graph-tooltip-value">{Number(y).toFixed(6)}</span>
      </div>
    </div>
  );
};

export function EdoNumerico() {
  const [method, setMethod] = useState("euler");
  const [rhs, setRhs] = useState("y");
  const [t0, setT0] = useState("0");
  const [y0, setY0] = useState("1");
  const [h, setH] = useState("0.1");
  const [tFinal, setTFinal] = useState("2");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [show3D, setShow3D] = useState(false);

  const loadExample = (ex) => {
    setRhs(ex.rhs);
    setT0(ex.t0);
    setY0(ex.y0);
    setH(ex.h);
    setTFinal(ex.tFinal);
    setResult(null);
    setError(null);
  };

  const handleCalculate = useCallback(() => {
    setLoading(true);
    setError(null);
    setResult(null);

    requestAnimationFrame(() => {
      try {
        const res = method === "rk4"
          ? edoRK4(rhs, t0, y0, h, tFinal)
          : edoEuler(rhs, t0, y0, h, tFinal);

        if (res.error) {
          setError(res.error);
        } else {
          setResult(res);
        }
      } catch (e) {
        setError(e.message || "Error al calcular la solución numérica.");
      } finally {
        setLoading(false);
      }
    });
  }, [method, rhs, t0, y0, h, tFinal]);

  const chartData = useMemo(
    () => result?.points?.map((p) => ({ t: Number(p.t), y: Number(p.y) })) ?? [],
    [result]
  );

  // ─── 3D check ───
  const plot3DInfo = useMemo(
    () => can3D(result, "numerico"),
    [result]
  );

  // Compute 3D ranges from result data
  const tRange3D = useMemo(() => {
    if (!result?.points?.length) return [0, 2];
    const ts = result.points.map(p => Number(p.t));
    return [Math.min(...ts), Math.max(...ts)];
  }, [result]);

  const yRange3D = useMemo(() => {
    if (!result?.points?.length) return [-2, 2];
    const ys = result.points.map(p => Number(p.y));
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    const pad = Math.max(1, (yMax - yMin) * 0.5);
    return [yMin - pad, yMax + pad];
  }, [result]);

  const isRK4 = result?.method === "rk4";

  return (
    <div className="solver-grid fade-up-2 edo-numerico">
      <div className="panel" id="edo-num-input-panel">
        <div className="panel-header">
          <span className="panel-title">Configuración</span>
        </div>
        <div className="panel-body">
          <div className="method-tabs edo-method-tabs">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`method-tab ${method === m.id ? "active" : ""}`}
                onClick={() => { setMethod(m.id); setResult(null); setError(null); }}
              >
                <span className="tab-name">{m.name}</span>
                <span className="tab-type">{m.type}</span>
              </button>
            ))}
          </div>

          <p className="edo-num-eq-hint">
            Resolvé <strong>y&apos; = f(t, y)</strong> con condición inicial y(t₀) = y₀.
          </p>

          <div className="field">
            <label htmlFor="edo-num-rhs">f(t, y) — lado derecho</label>
            <input
              id="edo-num-rhs"
              type="text"
              value={rhs}
              onChange={(e) => setRhs(e.target.value)}
              placeholder="y"
              spellCheck={false}
            />
            <small>Usá <code>t</code> e <code>y</code>. Ej: <code>-y</code>, <code>t + y</code>, <code>sin(t)</code></small>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="edo-num-t0">t₀</label>
              <input id="edo-num-t0" type="text" value={t0} onChange={(e) => setT0(e.target.value)} placeholder="0" />
            </div>
            <div className="field">
              <label htmlFor="edo-num-y0">y₀</label>
              <input id="edo-num-y0" type="text" value={y0} onChange={(e) => setY0(e.target.value)} placeholder="1" />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="edo-num-h">Paso h</label>
              <input id="edo-num-h" type="text" value={h} onChange={(e) => setH(e.target.value)} placeholder="0.1" />
            </div>
            <div className="field">
              <label htmlFor="edo-num-tf">t final</label>
              <input id="edo-num-tf" type="text" value={tFinal} onChange={(e) => setTFinal(e.target.value)} placeholder="2" />
            </div>
          </div>

          <button
            type="button"
            className="calc-submit"
            onClick={handleCalculate}
            disabled={loading || !rhs.trim()}
            id="edo-num-calc-btn"
          >
            {loading ? <><span className="calc-spinner" /> Calculando...</> : "Calcular"}
          </button>

          {error && <FriendlyErrorBox errorMsg={error} />}

          <div className="calc-examples">
            <span className="calc-examples-label">Ejemplos</span>
            <div className="calc-examples-list">
              {EXAMPLES.map((ex, i) => (
                <button key={i} type="button" className="calc-example-chip" onClick={() => loadExample(ex)}>
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel" id="edo-num-result-panel">
        <div className="panel-header">
          <span className="panel-title">Resultado</span>
          {result && (
            <span style={{ fontSize: "9px", color: "var(--muted)", letterSpacing: "1px" }}>
              {result.totalSteps} pasos
            </span>
          )}
        </div>
        <div className="panel-body">
          {!result ? (
            <div className="result-placeholder">
              <span style={{ fontSize: 32, opacity: 0.3 }}>∫</span>
              <p>Configurá la EDO y presioná Calcular</p>
            </div>
          ) : (
            <div className="fade-up">
              <div className="status-bar" style={{
                background: "rgba(108,189,181,0.1)",
                borderColor: "rgba(108,189,181,0.3)",
              }}>
                <div className="status-dot" style={{ background: "var(--teal)" }} />
                <span className="status-text" style={{ color: "var(--teal)" }}>
                  {result.methodLabel} · y(t<sub>f</sub>) ≈ {result.yFinal}
                </span>
              </div>

              <div className="edo-num-summary">
                <span className="math-meta-tag">y&apos; = {result.rhs}</span>
                <span className="math-meta-tag">t₀ = {result.t0}, y₀ = {result.y0}</span>
                <span className="math-meta-tag">h = {result.h}</span>
              </div>

              <div className="graph-container">
                <div className="graph-header graph-header--with-3d">
                  <span className="graph-label">y(t) — solución numérica</span>
                  {plot3DInfo.canShow && (
                    <Plot3DTrigger
                      onClick={() => setShow3D(true)}
                      id="edo-num-3d-btn"
                    />
                  )}
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 12, right: 24, left: 8, bottom: 16 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      tick={{ fontSize: 10, fill: "var(--muted)", fontFamily: "'DM Mono', monospace" }}
                      label={{ value: "t", position: "insideBottomRight", offset: -4, fontSize: 11, fill: "var(--muted)" }}
                    />
                    <YAxis
                      dataKey="y"
                      tick={{ fontSize: 10, fill: "var(--muted)", fontFamily: "'DM Mono', monospace" }}
                      label={{ value: "y", angle: -90, position: "insideLeft", offset: 8, fontSize: 11, fill: "var(--muted)" }}
                    />
                    <Tooltip content={<GraphTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="y"
                      stroke="var(--teal)"
                      strokeWidth={2}
                      dot={chartData.length <= 30}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="table-wrap edo-num-table-wrap">
                <table className="iter-table">
                  <thead>
                    <tr>
                      <th>n</th>
                      <th>t</th>
                      <th>y</th>
                      {isRK4 ? (
                        <>
                          <th>k₁</th>
                          <th>k₂</th>
                          <th>k₃</th>
                          <th>k₄</th>
                        </>
                      ) : (
                        <>
                          <th>f(t,y)</th>
                          <th>Δy</th>
                        </>
                      )}
                      <th>y<sub>sig</sub></th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.iterations.map((row) => (
                      <tr key={row.n}>
                        <td>{row.n}</td>
                        <td>{row.t}</td>
                        <td>{row.y}</td>
                        {isRK4 ? (
                          <>
                            <td>{row.k1 ?? "—"}</td>
                            <td>{row.k2 ?? "—"}</td>
                            <td>{row.k3 ?? "—"}</td>
                            <td>{row.k4 ?? "—"}</td>
                          </>
                        ) : (
                          <>
                            <td>{row.f}</td>
                            <td>{row.detail}</td>
                          </>
                        )}
                        <td>{row.yNext}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Modal 3D ─── */}
          {plot3DInfo.canShow && (
            <Plot3DModal
              open={show3D}
              onClose={() => setShow3D(false)}
              plotType="surface"
              title={`y' = ${result?.rhs || rhs} — Vista 3D`}
              subtitle="Superficie z = f(t, y) y curva de la solución numérica"
              badge="Euler / RK4"
              rhsExpr={result?.rhs || rhs}
              points={result?.points}
              tRange={tRange3D}
              yRange={yRange3D}
            />
          )}
        </div>
      </div>
    </div>
  );
}
