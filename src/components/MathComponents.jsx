import React, { useRef, useEffect, useState } from "react";
import katex from "katex";

/* ─── MathRenderer ─────────────────────────────────────────────────────────── */
export function MathRenderer({ latex: latexStr, display = false, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !latexStr) return;
    try { katex.render(latexStr, ref.current, { displayMode: display, throwOnError: false, trust: true }); }
    catch { if (ref.current) ref.current.textContent = latexStr; }
  }, [latexStr, display]);
  if (!latexStr) return null;
  return <span ref={ref} className={`math-renderer ${display ? "math-display" : "math-inline"} ${className}`} />;
}

/* ─── MathResult ───────────────────────────────────────────────────────────── */
const OP_LABELS = { derive:"Derivada", integrate:"Integral", simplify:"Simplificación", factorize:"Factorización", solve:"Ecuación resuelta" };
const OP_ICONS = { derive:"∂", integrate:"∫", simplify:"≡", factorize:"⊞", solve:"✓" };

function SolveResult({ result }) {
  if (!result.solutions?.length) return <span className="math-no-solution">Sin soluciones reales</span>;
  return (<div className="math-solutions">{result.solutions.map((s, i) => (
    <div key={i} className="math-solution-item"><span className="math-solution-index">x<sub>{result.solutions.length > 1 ? i+1 : ""}</sub> =</span><MathRenderer latex={s.latex} /></div>
  ))}</div>);
}

export function MathResult({ result }) {
  if (!result) return null;
  const op = result.operation || "derive";
  return (
    <div className="math-result-card fade-up" id={`math-result-${op}`}>
      <div className="math-result-header">
        <span className="math-result-icon">{OP_ICONS[op] || "="}</span>
        <span className="math-result-label">{OP_LABELS[op] || op}</span>
        {result.cached && <span className="math-result-cached" title="Cache">⚡ cache</span>}
      </div>
      {result.input_latex && (
        <div className="math-result-input"><span className="math-result-input-label">Entrada</span><div className="math-result-input-expr"><MathRenderer latex={result.input_latex} display /></div></div>
      )}
      <div className="math-result-output">
        <span className="math-result-output-label">Resultado</span>
        <div className="math-result-output-expr">{op === "solve" ? <SolveResult result={result} /> : <MathRenderer latex={result.latex} display />}</div>
      </div>
      <div className="math-result-plain">{op === "solve" ? result.solutions?.map(s => s.plain).join(", ") : result.plain}</div>
      <div className="math-result-meta">
        {result.variable && <span className="math-meta-tag">var: {result.variable}</span>}
        {result.definite !== undefined && <span className="math-meta-tag">{result.definite ? "definida" : "indefinida"}</span>}
        {result.count !== undefined && <span className="math-meta-tag">{result.count} solución{result.count !== 1 ? "es" : ""}</span>}
      </div>
    </div>
  );
}

/* ─── MathInput ────────────────────────────────────────────────────────────── */
export function MathInput({ value, onChange, onValidate, placeholder = "x^2 + 3*x - 2", label = "Expresión", id = "math-expression-input" }) {
  const [preview, setPreview] = useState("");
  const [isValid, setIsValid] = useState(true);
  const timer = useRef(null);

  useEffect(() => {
    if (!value?.trim()) { setPreview(""); setIsValid(true); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (onValidate) {
        try {
          const res = await onValidate(value);
          if (res && !res.error) { setPreview(res.latex || ""); setIsValid(res.valid !== false); }
          else { setPreview(""); setIsValid(false); }
        } catch { setIsValid(true); setPreview(""); }
      }
    }, 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value, onValidate]);

  return (
    <div className="math-input-wrapper">
      <label htmlFor={id} className="math-input-label">{label}</label>
      <input id={id} type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`math-input-field ${!isValid ? "math-input-invalid" : ""}`} autoComplete="off" spellCheck={false} />
      {preview && <div className="math-input-preview"><MathRenderer latex={preview} /></div>}
    </div>
  );
}

/* ─── OperationSelector ────────────────────────────────────────────────────── */
const OPS = [
  { id:"derive", label:"Derivar", icon:"∂", hint:"df/dx" },
  { id:"integrate", label:"Integrar", icon:"∫", hint:"∫f dx" },
  { id:"simplify", label:"Simplificar", icon:"≡", hint:"reducir" },
  { id:"factorize", label:"Factorizar", icon:"⊞", hint:"factores" },
  { id:"solve", label:"Resolver", icon:"✓", hint:"x = ?" },
];

const EDO_TAB = { id: "edo", label: "EDO", icon: "∂", hint: "Ecuaciones diferenciales" };
const INTEGRACION_TAB = { id: "integracion", label: "Integración", icon: "∫ₐᵇ", hint: "Integración numérica (Trapecio · Simpson)" };

export function OperationSelector({ selected, onSelect, includeEdo = false, includeIntegracion = false }) {
  const tabs = [
    ...OPS,
    ...(includeEdo ? [EDO_TAB] : []),
    ...(includeIntegracion ? [INTEGRACION_TAB] : []),
  ];
  return (
    <div className="calc-operations" id="operation-selector">
      {tabs.map(op => (
        <button key={op.id} className={`calc-op-tab ${selected === op.id ? "active" : ""}`}
          onClick={() => onSelect(op.id)} id={`op-tab-${op.id}`} title={op.hint}>
          <span className="calc-op-icon">{op.icon}</span>
          <span className="calc-op-label">{op.label}</span>
        </button>
      ))}
    </div>
  );
}
