import { useState, useCallback, useMemo } from "react";
import { useMathEngine } from "../hooks/useMathEngine";
import { FriendlyErrorBox } from "./FriendlyErrorBox";
import { EDOMathExpr, EDOStepList } from "./EDOMathParts";
import { Plot3DModal } from "./Plot3DModal";
import { Plot3DTrigger } from "./Plot3DTrigger";
import { can3D } from "../utils/edoPlot3D";
import { compile } from "mathjs";

const SYSTEM_EXAMPLES = [
    {
        label: "Armónico (x,y)",
        equations: "x' = y\ny' = -x",
        vars: ["x", "y"],
        ics: { x: "1", y: "0" },
    },
    {
        label: "Lotka-Volterra",
        equations: "x' = x - x*y\ny' = x*y - y",
        vars: ["x", "y"],
        ics: { x: "2", y: "1" },
    },
    {
        label: "Sistema 3x3",
        equations: "x' = y\ny' = z\nz' = -x - y - z",
        vars: ["x", "y", "z"],
        ics: { x: "1", y: "0", z: "0" },
    },
    {
        label: "Circuito RC",
        equations: "x' = -x + y\ny' = -y",
        vars: ["x", "y"],
        ics: { x: "0", y: "1" },
    },
];

function parseVarsFromEquations(eqString) {
    const lines = eqString.split(/[;\n]/).map(l => l.trim()).filter(Boolean);
    const vars = [];
    lines.forEach(line => {
        const m = line.match(/^([a-zA-Z]+)\s*'/);
        if (m && !vars.includes(m[1])) vars.push(m[1]);
    });
    return vars.length > 0 ? vars : ["x", "y"];
}

export function SistemaEDO() {
    const { odeSystem, loading, error, clearError } = useMathEngine();

    const [equations, setEquations] = useState("x' = y\ny' = -x");
    const [ics, setIcs] = useState({ x: "1", y: "0" });
    const [result, setResult] = useState(null);

    const detectedVars = parseVarsFromEquations(equations);

    const loadExample = (ex) => {
        setEquations(ex.equations);
        const newIcs = {};
        ex.vars.forEach(v => { newIcs[v] = ex.ics[v] ?? "0"; });
        setIcs(newIcs);
        setResult(null);
        clearError();
    };

    const syncIcs = useCallback((vars) => {
        setIcs(prev => {
            const next = {};
            vars.forEach(v => { next[v] = prev[v] ?? "0"; });
            return next;
        });
    }, []);

    const handleEquationsChange = (val) => {
        setEquations(val);
        syncIcs(parseVarsFromEquations(val));
    };

    const handleSolve = useCallback(async () => {
        if (!equations.trim()) return;
        clearError();
        setResult(null);
        try {
            const equationsArray = equations
                .split(/[;\n]/)
                .map(e => e.trim())
                .filter(Boolean);
            const res = await odeSystem(equationsArray, ics);
            setResult(res);
        } catch {
            /* error en el hook */
        }
    }, [equations, ics, odeSystem, clearError]);

    const reset = () => {
        setEquations("x' = y\ny' = -x");
        setIcs({ x: "1", y: "0" });
        setResult(null);
        clearError();
    };

    return (
        <div className="solver-grid fade-up-2">
            <div className="panel" id="sistema-input-panel">
                <div className="panel-header">
                    <span className="panel-title">Entrada</span>
                </div>
                <div className="panel-body">
                    <div className="field">
                        <label htmlFor="sistema-equations">Ecuaciones del sistema</label>
                        <textarea
                            id="sistema-equations"
                            rows={5}
                            value={equations}
                            onChange={e => handleEquationsChange(e.target.value)}
                            placeholder={"x' = y\ny' = -x"}
                            spellCheck={false}
                        />
                        <small>Una ecuación por línea. Ej: x&apos; = y — separá con Enter o punto y coma.</small>
                    </div>

                    <div className="field">
                        <label>Condiciones iniciales (en t = 0)</label>
                        <div className="edo-ic-grid">
                            {detectedVars.map(v => (
                                <div key={v} className="edo-ic-row edo-ic-row--compact">
                                    <span className="edo-ic-label">{v}(0) =</span>
                                    <input
                                        type="text"
                                        value={ics[v] ?? "0"}
                                        onChange={e => setIcs(prev => ({ ...prev, [v]: e.target.value }))}
                                        placeholder="0"
                                    />
                                </div>
                            ))}
                        </div>
                        <small>Variables detectadas: {detectedVars.join(", ")}</small>
                    </div>

                    <button
                        className="calc-submit"
                        onClick={handleSolve}
                        disabled={loading || !equations.trim()}
                        id="sistema-solve-btn"
                    >
                        {loading
                            ? <><span className="calc-spinner" /> Calculando...</>
                            : "Calcular"}
                    </button>

                    <button type="button" className="calc-btn-secondary" onClick={reset}>
                        Reiniciar
                    </button>

                    {error && <FriendlyErrorBox errorMsg={error} />}

                    <div className="calc-examples">
                        <span className="calc-examples-label">Ejemplos</span>
                        <div className="calc-examples-list">
                            {SYSTEM_EXAMPLES.map((ex, i) => (
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

            <div className="panel" id="sistema-result-panel">
                <div className="panel-header">
                    <span className="panel-title">Resultado</span>
                </div>
                <div className="panel-body">
                    {result && !error ? (
                <SistemaResult result={result} />
                    ) : (
                        <div className="result-placeholder">
                            <span style={{ fontSize: 32, opacity: 0.3 }}>∂</span>
                            <p>Ingresá el sistema y presioná Calcular</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SistemaResult({ result }) {
    const [showSteps, setShowSteps] = useState(false);
    const [show3D, setShow3D] = useState(false);

    // Check if 3D is possible
    const plot3DInfo = useMemo(
        () => can3D(result, "sistema"),
        [result]
    );

    // Get available variable names
    const varNames = useMemo(
        () => result?.solutions ? Object.keys(result.solutions) : [],
        [result]
    );

    // Selected variables for 3D axes
    const [selectedVars, setSelectedVars] = useState(
        () => varNames.slice(0, Math.min(3, varNames.length))
    );

    // Numerically evaluate symbolic solutions for trajectory
    const trajectoryData = useMemo(() => {
        if (!plot3DInfo.canShow || !result?.solutions) return null;

        const vars = selectedVars.length >= 2 ? selectedVars : varNames.slice(0, Math.min(3, varNames.length));
        if (vars.length < 2) return null;

        const steps = 300;
        const tMax = 10;
        const dt = tMax / steps;

        // Try to compile and evaluate each solution expression
        const compiled = {};
        for (const v of vars) {
            const sol = result.solutions[v];
            if (!sol) continue;
            const expr = typeof sol === "object" ? (sol.plain || "") : String(sol);
            try {
                compiled[v] = compile(expr);
            } catch {
                return null; // Can't evaluate symbolically
            }
        }

        const x = [], y = [], z = [];
        for (let i = 0; i <= steps; i++) {
            const t = i * dt;
            try {
                const vals = {};
                for (const v of vars) {
                    if (compiled[v]) {
                        const val = compiled[v].evaluate({ t });
                        vals[v] = typeof val === "number" && isFinite(val) ? val : NaN;
                    }
                }
                if (Object.values(vals).some(v => isNaN(v))) continue;
                x.push(vals[vars[0]] ?? 0);
                y.push(vals[vars[1]] ?? 0);
                z.push(vars[2] ? (vals[vars[2]] ?? t) : t);
            } catch {
                continue;
            }
        }

        if (x.length < 2) return null;
        return { x, y, z };
    }, [plot3DInfo.canShow, result, selectedVars, varNames]);

    const axisLabels = useMemo(() => {
        const vars = selectedVars.length >= 2 ? selectedVars : varNames.slice(0, Math.min(3, varNames.length));
        return [
            vars[0] || "x",
            vars[1] || "y",
            vars[2] || "t",
        ];
    }, [selectedVars, varNames]);

    return (
        <div className="math-result-card fade-up">
            <div className="math-result-header">
                <span className="math-result-icon">∂</span>
                <span className="math-result-label">Sistema resuelto</span>
                {plot3DInfo.canShow && trajectoryData && (
                    <Plot3DTrigger
                        onClick={() => setShow3D(true)}
                        id="sistema-3d-btn"
                    />
                )}
            </div>

            {result.solutions && Object.entries(result.solutions).map(([varName, sol]) => (
                <div key={varName} className="math-result-output">
                    <span className="math-result-output-label">{varName}(t)</span>
                    <EDOMathExpr value={sol} />
                </div>
            ))}

            {result.general_solution && !result.solutions && (
                <div className="math-result-output edo-result-highlight">
                    <span className="math-result-output-label">Solución general</span>
                    <EDOMathExpr value={result.general_solution} className="edo-solution-primary" />
                </div>
            )}

            {result.eigenvalues && (
                <div className="math-result-meta">
                    {result.eigenvalues.map((ev, i) => (
                        <span key={i} className="math-meta-tag">λ{i + 1} = {String(ev)}</span>
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

            {(result.method || result.dimension) && (
                <div className="math-result-meta">
                    {result.method && <span className="math-meta-tag">método: {result.method}</span>}
                    {result.dimension && (
                        <span className="math-meta-tag">dimensión: {result.dimension}×{result.dimension}</span>
                    )}
                </div>
            )}

            {/* ─── Modal 3D ─── */}
            {plot3DInfo.canShow && trajectoryData && (
                <Plot3DModal
                    open={show3D}
                    onClose={() => setShow3D(false)}
                    plotType={plot3DInfo.plotType}
                    title="Trayectoria del sistema — Vista 3D"
                    subtitle="Curva en el espacio de fases (variables vs. tiempo)"
                    badge="Sistema"
                    trajectoryData={trajectoryData}
                    axisLabels={axisLabels}
                    availableVars={varNames.length > 3 ? varNames : undefined}
                    onVarsChange={setSelectedVars}
                />
            )}
        </div>
    );
}
