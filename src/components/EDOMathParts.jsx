import { MathRenderer } from "./MathComponents";

/** Normaliza respuesta del motor: string legacy o { plain, latex }. */
export function resolveMathValue(value) {
    if (value == null) return { plain: "", latex: null };
    if (typeof value === "object" && ("latex" in value || "plain" in value)) {
        return {
            plain: value.plain ?? "",
            latex: value.latex ?? null,
        };
    }
    return { plain: String(value), latex: null };
}

/** Bloque de expresión matemática (KaTeX si hay latex). */
export function EDOMathExpr({ value, display = true, className = "" }) {
    const { plain, latex } = resolveMathValue(value);
    if (!plain && !latex) return null;

    if (latex) {
        return (
            <div className={`math-result-output-expr ${className}`.trim()}>
                <MathRenderer latex={latex} display={display} />
            </div>
        );
    }

    return <div className={`math-result-plain ${className}`.trim()}>{plain}</div>;
}

/** Lista de pasos del procedimiento (LaTeX + texto legible). */
export function EDOStepList({ steps }) {
    if (!steps?.length) return null;

    return (
        <ol className="stepbystep-list edo-step-list">
            {steps.map((step, i) => {
                if (typeof step === "string") {
                    return (
                        <li key={i} className="edo-step-item">
                            <p className="edo-step-text">{step}</p>
                        </li>
                    );
                }
                return (
                    <li key={i} className="edo-step-item">
                        {step.label && (
                            <span className="edo-step-label">{step.label}</span>
                        )}
                        {step.latex && (
                            <div className="edo-step-math">
                                <MathRenderer latex={step.latex} display />
                            </div>
                        )}
                        {step.text && (
                            <p className={`edo-step-text${step.latex ? " edo-step-text--note" : ""}`}>
                                {step.text}
                            </p>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
