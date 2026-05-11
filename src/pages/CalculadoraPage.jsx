import React, { useState, useEffect, useCallback } from "react";
import { useMathEngine } from "../hooks/useMathEngine";
import { MathResult, MathInput, OperationSelector, MathRenderer } from "../components/MathComponents";
import { EDOOrdenSuperior } from "./EDOOrdenSuperior";
import { SistemaEDO } from "./SistemaEDO";

const EXAMPLE_EXPRESSIONS = {
  derive:    ["x^3 - 2*x + 1", "sin(x)*cos(x)", "exp(x)*x^2", "ln(x)/x"],
  integrate: ["x^2", "sin(x)", "1/(1+x^2)", "exp(-x)"],
  simplify:  ["(x^2 - 1)/(x - 1)", "sin(x)^2 + cos(x)^2", "(a+b)^2 - a^2 - 2*a*b"],
  factorize: ["x^2 - 4", "x^3 - 8", "x^2 + 5*x + 6", "x^4 - 1"],
  solve:     ["x^2 - 4 = 0", "x^2 + 2*x - 3 = 0", "sin(x) = 0", "exp(x) = 1"],
};

export function CalculadoraPage() {
  const { derive, integrate, simplify, factorize, solve, validate, checkHealth, loading, error, clearError, addHistory } = useMathEngine();

  const [operation, setOperation] = useState("derive");
  const [expression, setExpression] = useState("");
  const [variable, setVariable] = useState("x");
  const [lowerBound, setLowerBound] = useState("");
  const [upperBound, setUpperBound] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [serverUp, setServerUp] = useState(null);

  // ─── MODO EDO ───
  const [edoSubTab, setEdoSubTab] = useState("orden_superior");
  const isEdoMode = operation === "edo";

  // ─── Lógica principal ───
  useEffect(() => {
    checkHealth().then(setServerUp);
    const interval = setInterval(() => checkHealth().then(setServerUp), 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  useEffect(() => { setResult(null); clearError(); }, [operation]);

  const handleCalculate = useCallback(async () => {
    if (!expression.trim()) return;
    clearError();
    try {
      let res;
      switch (operation) {
        case "derive":    res = await derive(expression, variable); break;
        case "integrate": res = await integrate(expression, variable, lowerBound || null, upperBound || null); break;
        case "simplify":  res = await simplify(expression, variable); break;
        case "factorize": res = await factorize(expression, variable); break;
        case "solve":     res = await solve(expression, variable); break;
        case "edo":       res = null; break; // Manejado por componentes EDO
        default:          return;
      }
      if (res) {
        setResult(res);
        // Guardar en historial si NO es EDO
        if (operation !== "edo") {
          addHistory({ operation, expression, result: res, variable });
        }
      }
    } catch { /* error ya manejado en el hook */ }
  }, [operation, expression, variable, lowerBound, upperBound, derive, integrate, simplify, factorize, solve, addHistory]);

  const handleKeyDown = (e) => { if (e.key === "Enter" && !loading) handleCalculate(); };
  const handleExample = (ex) => { setExpression(ex); setResult(null); clearError(); };
  const resetEDO = () => ({
    equation: "y'' + y = 0",
    ics: [{ d: "0", at: "0", v: "1" }, { d: "1", at: "0", v: "0" }],
    result: null
  });

  return (
    <div className="solver calculadora-page fade-up" id="calculadora-page">
      {/* Header */}
      <header className="page-header fade-up">
        <p className="page-eyebrow">Motor Simbólico</p>
        <h1 className="page-title">Calculadora <em>Simbólica</em></h1>
      </header>

      {/* Status */}
      <div className={`calc-status ${serverUp === true ? "calc-status--ok" : serverUp === false ? "calc-status--off" : "calc-status--loading"}`} id="server-status">
        <span className="calc-status-dot" />
        <span className="calc-status-text">
          {serverUp === true ? "Motor conectado" : serverUp === false ? "Motor desconectado" : "Verificando..."}
        </span>
      </div>

      {/* Operation tabs */}
      <OperationSelector selected={operation} onSelect={setOperation} />

      {/* BOTÓN MODELO EDO (NUEVO) */}
      <div className="edo-tab-inject">
        <button
          className={`edo-main-tab ${isEdoMode ? "edo-main-tab--active" : ""}`}
          onClick={() => setOperation("edo")}
          id="tab-edo"
        >
          <span className="edo-main-tab-icon">∂</span>
          EDO
          <span className="edo-main-tab-new">Nuevo</span>
        </button>
      </div>

      {/* ─── MODO EDO ─── */}
      {isEdoMode && (
        <div className="edo-section fade-up" id="edo-section">
          {/* Sub-tabs */}
          <div className="edo-subtabs">
            {["orden_superior", "sistema"].map(tab => (
              <button
                key={tab}
                className={`edo-subtab ${edoSubTab === tab ? "edo-subtab--active" : ""}`}
                onClick={() => setEdoSubTab(tab)}
                id={`edo-subtab-${tab}`}
              >
                <span className="edo-subtab-label">{tab === 'orden_superior' ? "Orden Superior" : "Sistema"}</span>
                <span className="edo-subtab-tag">{tab === "orden_superior" ? "Nuevo" : ""}</span>
                <span className="edo-subtab-desc">{tab === 'orden_superior' ? "Ecuaciones lineales no homogéneas" : "Sistemas de ecuaciones"}</span>
              </button>
            ))}
          </div>

          {/* Componente EDO */}
          <div className="edo-subtab-content">
            {edoSubTab === "orden_superior" && <EDOOrdenSuperior />}
            {edoSubTab === "sistema" && <SistemaEDO />}
          </div>
        </div>
      )}

      {/* ─── MODO CONVENCIONAL (OPERACIONES BÁSICAS) ─── */}
      {!isEdoMode && (
        <>
          {/* Main grid */}
          <div className="solver-grid fade-up-2">
            {/* ── Left panel: Input ── */}
            <div className="panel" id="input-panel">
              <div className="panel-header">
                <span className="panel-title">Entrada</span>
              </div>
              <div className="panel-body">
                <MathInput
                  value={expression}
                  onChange={setExpression}
                  onValidate={validate}
                  label={operation === "solve" ? "Ecuación" : "Expresión"}
                  placeholder={EXAMPLE_EXPRESSIONS[operation]?.[0] || "x^2 + 3*x"}
                  id="calc-expression-input"
                />

                {/* Variable */}
                <div className="field">
                  <label htmlFor="calc-variable">Variable</label>
                  <input
                    id="calc-variable"
                    type="text"
                    value={variable}
                    onChange={e => setVariable(e.target.value || "x")}
                    placeholder="x"
                    maxLength={3}
                    onKeyDown={handleKeyDown}
                  />
                </div>

                {/* Bounds for integration */}
                {operation === "integrate" && (
                  <div className="calc-bounds fade-up">
                    <div className="divider"><span>Límites (opcional)</span></div>
                    <div className="field-row">
                      <div className="field">
                        <label htmlFor="calc-lower">Inferior</label>
                        <input id="calc-lower" type="text" value={lowerBound} onChange={e => setLowerBound(e.target.value)} placeholder="0" />
                      </div>
                      <div className="field">
                        <label htmlFor="calc-upper">Superior</label>
                        <input id="calc-upper" type="text" value={upperBound} onChange={e => setUpperBound(e.target.value)} placeholder="1" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Calculate button */}
                <button className="calc-submit" onClick={handleCalculate} disabled={loading || !expression.trim()} id="calc-submit-btn" onKeyDown={handleKeyDown}>
                  {loading ? <><span className="calc-spinner" /> Calculando...</> : "Calcular"}
                </button>

                {error && <div className="solver-error fade-up" id="calc-error">{error}</div>}

                {/* Ejemplos */}
                <div className="calc-examples">
                  <span className="calc-examples-label">Ejemplos</span>
                  <div className="calc-examples-list">
                    {(EXAMPLE_EXPRESSIONS[operation] || []).map((ex, i) => (
                      <button key={i} className="calc-example-chip" onClick={() => handleExample(ex)} id={`example-${operation}-${i}`}>
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right panel: Resultado ── */}
            <div className="panel" id="result-panel">
              <div className="panel-header">
                <span className="panel-title">Resultado</span>
                {result?.cached && <span className="calc-cache-badge">⚡ desde cache</span>}
              </div>
              <div className="panel-body">
                {result ? (
                  <MathResult result={result} />
                ) : (
                  <div className="result-placeholder">
                    <span style={{ fontSize: 32, opacity: 0.3 }}>∑</span>
                    <p>Ingresá una expresión y presioná Calcular</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Historial ── */}
          {history.length > 0 && (
            <div className="calc-history panel fade-up-3" id="history-panel">
              <div className="panel-header">
                <span className="panel-title">Historial reciente</span>
                <button className="calc-history-clear" onClick={() => setHistory([])}>Limpiar</button>
              </div>
              <div className="panel-body">
                <div className="calc-history-list">
                  {history.map((item, i) => (
                    <button
                      key={i}
                      className="calc-history-item"
                      onClick={() => { setExpression(item.input); setOperation(item.operation); setResult(item); }}
                      id={`history-item-${i}`}
                    >
                      <span className="calc-history-op">{item.operation}</span>
                      <span className="calc-history-expr">{item.input}</span>
                      <span className="calc-history-arrow">→</span>
                      <span className="calc-history-res">
                        {item.operation === "solve" ? `${item.count} sol.` : item.plain}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Referencia rápida ── */}
          <div className="calc-reference panel fade-up-3" id="reference-panel">
            <div className="panel-header"><span className="panel-title">Referencia rápida</span></div>
            <div className="panel-body">
              <div className="calc-ref-grid">
                <div className="calc-ref-item"><code>^</code> <span>Potencia</span> <MathRenderer latex="x^2" /></div>
                <div className="calc-ref-item"><code>sqrt()</code> <span>Raíz</span> <MathRenderer latex="\sqrt{x}" /></div>
                <div className="calc-ref-item"><code>sin() cos() tan()</code> <span>Trig.</span> <MathRenderer latex="\sin(x)" /></div>
                <div className="calc-ref-item"><code>ln() / log()</code> <span>Log.</span> <MathRenderer latex="\ln(x)" /></div>
                <div className="calc-ref-item"><code>exp()</code> <span>Exp.</span> <MathRenderer latex="e^x" /></div>
                <div className="calc-ref-item"><code>pi, e</code> <span>Const.</span> <MathRenderer latex="\pi,\; e" /></div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
