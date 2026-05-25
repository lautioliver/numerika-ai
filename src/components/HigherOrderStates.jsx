import { useState, useCallback } from "react";
import { useMathEngine } from "../hooks/useMathEngine";
import { FriendlyErrorBox } from "./FriendlyErrorBox";
import { EDOMathExpr, EDOStepList } from "./EDOMathParts";
import { MathRenderer } from "./MathComponents";

const EDO_EXAMPLES = [
    { label: "Armónico simple", eq: "y'' + y = 0", ics: [{ d: "0", at: "0", v: "1" }, { d: "1", at: "0", v: "0" }] },
    { label: "Amortiguado", eq: "y'' + 2*y' + y = 0", ics: [{ d: "0", at: "0", v: "1" }, { d: "1", at: "0", v: "0" }] },
    { label: "No homogénea", eq: "y'' - y = exp(x)", ics: [{ d: "0", at: "0", v: "0" }, { d: "1", at: "0", v: "1" }] },
    { label: "Orden 1 simple", eq: "y' - y = 0", ics: [{ d: "0", at: "0", v: "1" }] },
    { label: "Con forzamiento", eq: "y'' + 4*y = sin(2*x)", ics: [{ d: "0", at: "0", v: "0" }, { d: "1", at: "0", v: "0" }] },
];

const SYNTAX_TIPS = [
    { sym: "y'", desc: "primera derivada" },
    { sym: "y''", desc: "segunda derivada" },
    { sym: "y'''", desc: "tercera derivada" },
    { sym: "exp(x)", desc: "función exponencial" },
    { sym: "sin(x), cos(x)", desc: "trigonométricas" },
];

export function EDOOrdenSuperior() {
    const { odeSolve, loading, error, clearError } = useMathEngine();

    const [equation, setEquation] = useState("y'' + y = 0");
    const [ics, setIcs] = useState([
        { d: "0", at: "0", v: "1" },
        { d: "1", at: "0", v: "0" },
    ]);
    const [result, setResult] = useState(null);
    const [showSyntax, setShowSyntax] = useState(false);

    const addIC = () => setIcs(p => [...p, { d: String(p.length), at: "0", v: "0" }]);
    const removeIC = (i) => setIcs(p => p.filter((_, idx) => idx !== i));
    const updateIC = (i, field, val) => setIcs(p => p.map((ic, idx) => idx === i ? { ...ic, [field]: val } : ic));

    const loadExample = (ex) => {
        setEquation(ex.eq);
        setIcs(ex.ics);
        setResult(null);
        clearError();
    };

    const handleSolve = useCallback(async () => {
        if (!equation.trim()) return;
        clearError();
        setResult(null);
        try {
            const res = await odeSolve(equation, ics.filter(ic => ic.v !== ""));
            setResult(res);
        } catch {
            /* error en el hook */
        }
    }, [equation, ics, odeSolve, clearError]);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !loading) handleSolve();
    };

    const derivLabel = (d) => {
        const ord = parseInt(d, 10);
        if (ord === 0) return "y";
        if (ord === 1) return "y′";
        if (ord === 2) return "y″";
        return `y(${ord})`;
    };

    return (
        <>
            <div className="solver-grid fade-up-2">
                <div className="panel" id="edo-input-panel">
                    <div className="panel-header">
                        <span className="panel-title">Entrada</span>
                    </div>
                    <div className="panel-body">
                        <div className="field">
                            <label htmlFor="edo-equation">Ecuación diferencial</label>
                            <input
                                id="edo-equation"
                                type="text"
                                value={equation}
                                onChange={e => setEquation(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="y'' + y = 0"
                                autoComplete="off"
                                spellCheck={false}
                            />
                            <small>Usá y′, y″ o y&apos;&apos; para derivadas. Variable independiente: x.</small>
                        </div>

                        <div className="field">
                            <label>Condiciones iniciales</label>
                            <div className="edo-ic-list">
                                {ics.map((ic, i) => (
                                    <div key={i} className="edo-ic-row">
                                        <span className="edo-ic-label">
                                            {derivLabel(ic.d)}(
                                            <input
                                                type="text"
                                                className="edo-ic-at"
                                                value={ic.at}
                                                onChange={e => updateIC(i, "at", e.target.value)}
                                                placeholder="0"
                                                title="Punto de evaluación"
                                            />
                                            ) =
                                        </span>
                                        <input
                                            type="text"
                                            value={ic.v}
                                            onChange={e => updateIC(i, "v", e.target.value)}
                                            placeholder="0"
                                        />
                                        <select
                                            className="edo-ic-order"
                                            value={ic.d}
                                            onChange={e => updateIC(i, "d", e.target.value)}
                                            title="Orden de la derivada"
                                        >
                                            {[0, 1, 2, 3, 4].map(n => (
                                                <option key={n} value={String(n)}>{derivLabel(String(n))}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            className="edo-ic-remove"
                                            onClick={() => removeIC(i)}
                                            title="Eliminar condición"
                                            aria-label="Eliminar condición"
                                        >✕</button>
                                    </div>
                                ))}
                            </div>
                            <button type="button" className="calc-btn-secondary edo-ic-add" onClick={addIC}>
                                + Agregar condición
                            </button>
                        </div>

                        <button
                            className="calc-submit"
                            onClick={handleSolve}
                            disabled={loading || !equation.trim()}
                            id="edo-solve-btn"
                        >
                            {loading
                                ? <><span className="calc-spinner" /> Calculando...</>
                                : "Calcular"}
                        </button>

                        <button
                            type="button"
                            className="calc-btn-secondary"
                            onClick={() => { setResult(null); clearError(); }}
                        >
                            Limpiar
                        </button>

                        {error && <FriendlyErrorBox errorMsg={error} />}

                        <div className="calc-examples">
                            <span className="calc-examples-label">Ejemplos</span>
                            <div className="calc-examples-list">
                                {EDO_EXAMPLES.map((ex, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        className="calc-example-chip"
                                        onClick={() => loadExample(ex)}
                                    >
                                        {ex.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="panel" id="edo-result-panel">
                    <div className="panel-header">
                        <span className="panel-title">Resultado</span>
                    </div>
                    <div className="panel-body">
                        {result && !error ? (
                            <EDOResult result={result} equation={equation} />
                        ) : (
                            <div className="result-placeholder">
                                <span style={{ fontSize: 32, opacity: 0.3 }}>∂</span>
                                <p>Ingresá una EDO y presioná Calcular</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="calc-reference panel edo-syntax-panel fade-up-3">
                <div className="panel-header">
                    <span className="panel-title">Referencia rápida</span>
                    <button
                        type="button"
                        className="calc-history-clear"
                        onClick={() => setShowSyntax(v => !v)}
                    >
                        {showSyntax ? "Ocultar" : "Ver sintaxis"}
                    </button>
                </div>
                {showSyntax && (
                    <div className="panel-body">
                        <div className="calc-ref-grid">
                            {SYNTAX_TIPS.map((tip, i) => (
                                <div key={i} className="calc-ref-item">
                                    <code>{tip.sym}</code>
                                    <span>{tip.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

function EDOResult({ result, equation }) {
    const [showSteps, setShowSteps] = useState(false);

    return (
        <div className="math-result-card fade-up">
            <div className="math-result-header">
                <span className="math-result-icon">∂</span>
                <span className="math-result-label">EDO resuelta</span>
            </div>

            {equation && (
                <div className="math-result-input">
                    <span className="math-result-input-label">Ecuación</span>
                    <div className="math-result-input-expr">
                        {result.input_latex ? (
                            <MathRenderer latex={result.input_latex} display />
                        ) : (
                            <span className="math-result-plain edo-eq-plain">{equation}</span>
                        )}
                    </div>
                </div>
            )}

            {result.general_solution && (
                <div className="math-result-output">
                    <span className="math-result-output-label">Solución general</span>
                    <EDOMathExpr value={result.general_solution} />
                </div>
            )}

            {result.particular_solution && (
                <div className="math-result-output edo-result-highlight">
                    <span className="math-result-output-label">Solución particular (con C.I.)</span>
                    <EDOMathExpr value={result.particular_solution} className="edo-solution-primary" />
                </div>
            )}

            {result.classification && (
                <div className="math-result-meta">
                    {Object.entries(result.classification).map(([k, v]) => (
                        <span key={k} className="math-meta-tag">{k}: {String(v)}</span>
                    ))}
                </div>
            )}

            {result.steps?.length > 0 && (
                <div className="stepbystep">
                    <button
                        className="stepbystep-toggle"
                        onClick={() => setShowSteps(v => !v)}
                        type="button"
                    >
                        <span className="stepbystep-toggle-left">
                            <span className="stepbystep-arrow">{showSteps ? "▾" : "▸"}</span>
                            Procedimiento de resolución
                        </span>
                        <span className="stepbystep-badge">{showSteps ? "Cerrar" : "Ver pasos"}</span>
                    </button>
                    {showSteps && (
                        <div className="stepbystep-body fade-up">
                            <EDOStepList steps={result.steps} />
                        </div>
                    )}
                </div>
            )}

            {(result.method || result.order) && (
                <div className="math-result-meta">
                    {result.method && <span className="math-meta-tag">método: {result.method}</span>}
                    {result.order && <span className="math-meta-tag">orden: {result.order}</span>}
                </div>
            )}
        </div>
    );
}
