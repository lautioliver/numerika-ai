import { useState } from "react";

const C = {
  cream: "#E3DFBA",
  sage: "#C8D6BF",
  tealLt: "#93CCC6",
  teal: "#6CBDB5",
  dark: "#1A1F1E",
  bg: "#f5f3e8",
  surface: "#faf9f2",
  border: "#dddbc8",
  muted: "#7a8a82",
  text: "#1A1F1E",
};

const GUIDES = {
  biseccion: {
    title: "¿Cómo funciona la Bisección?",
    steps: [
      {
        label: "Elegí el intervalo",
        text: "Necesitás a y b tal que f(a) y f(b) tengan signos opuestos. Eso garantiza que hay al menos una raíz en [a, b] (Teorema de Bolzano).",
      },
      {
        label: "Calculá el punto medio",
        text: "c = (a + b) / 2. Éste es tu candidato a raíz en cada iteración.",
      },
      {
        label: "Reducí el intervalo",
        text: "Si f(a)·f(c) < 0, la raíz está en [a, c]. Si no, está en [c, b]. Reemplazás el extremo que tiene el mismo signo que f(c).",
      },
      {
        label: "Repetí hasta converger",
        text: "El error se calcula como |( cₙ − cₙ₋₁) / cₙ| × 100. Cuando ese porcentaje sea menor que tu tolerancia, el método convergió.",
      },
    ],
    example:
      "f(x) = x² − x − 2,  [a=1, b=3]\nc₁ = (1+3)/2 = 2 → f(2) = −0.0 < 0 → nuevo intervalo [2, 3]\nc₂ = (2+3)/2 = 2.5 → f(2.5) = 0.75 > 0 → nuevo intervalo [2, 2.5]\n⋯ converge a x ≈ 2.0000 (raíz exacta: x = 2)",
  },
  reglafalsa: {
    title: "¿Cómo funciona la Regla Falsa?",
    steps: [
      {
        label: "Misma condición inicial",
        text: "Al igual que bisección, necesitás f(a)·f(b) < 0 para garantizar la existencia de la raíz en [a, b].",
      },
      {
        label: "Interpolación lineal",
        text: "En vez de tomar el punto medio, trazás una recta entre (a, f(a)) y (b, f(b)) y calculás donde cruza el eje x: c = b − f(b)·(b−a) / (f(b)−f(a))",
      },
      {
        label: "Reducí el intervalo",
        text: "Igual que bisección: reemplazás el extremo del mismo signo que f(c). La ventaja es que c se acerca más rápido a la raíz en funciones suaves.",
      },
      {
        label: "Cuidado con la convergencia lenta",
        text: "Si la función es muy curva, uno de los extremos puede quedar fijo por muchas iteraciones (convergencia unilateral). Es una limitación conocida del método.",
      },
    ],
    example:
      "f(x) = x² − x − 2,  [a=1, b=3]\nc₁ = 3 − f(3)·(3−1)/(f(3)−f(1)) = 3 − 4·2/(4−(−2)) = 3 − 8/6 ≈ 1.667\nf(1.667) < 0 → nuevo intervalo [1.667, 3]\n⋯ converge más rápido que bisección hacia x = 2",
  },
  newton: {
    title: "¿Cómo funciona Newton-Raphson?",
    steps: [
      {
        label: "Elegí un punto inicial x₀",
        text: "Tiene que estar cerca de la raíz. Si elegís un punto donde f′(x) ≈ 0, el método puede fallar o divergir.",
      },
      {
        label: "Trazá la tangente",
        text: "La idea geométrica es trazar la recta tangente a f en x₀ y ver dónde cruza el eje x. Eso da: x₁ = x₀ − f(x₀) / f′(x₀)",
      },
      {
        label: "Iterá desde el nuevo punto",
        text: "Usás x₁ como nuevo punto de partida y repetís el proceso. La convergencia es cuadrática: los decimales correctos se duplican en cada iteración.",
      },
      {
        label: "Derivada numérica",
        text: "NumérikaAI calcula f′(x) automáticamente con diferencias centrales: f′(x) ≈ [f(x+h) − f(x−h)] / 2h, con h = 10⁻⁷",
      },
    ],
    example:
      "f(x) = x² − x − 2,  x₀ = 3\nf(3) = 4,  f′(3) ≈ 5\nx₁ = 3 − 4/5 = 2.2\nf(2.2) = 0.24,  f′(2.2) ≈ 3.4\nx₂ = 2.2 − 0.24/3.4 ≈ 2.029\n⋯ converge muy rápido a x = 2",
  },
  secante: {
    title: "¿Cómo funciona el Método de la Secante?",
    steps: [
      {
        label: "Dos puntos iniciales",
        text: "Necesitás x₀ y x₁. No necesitan tener signos opuestos como en bisección. Cuanto más cerca de la raíz, mejor.",
      },
      {
        label: "Aproximá la derivada",
        text: "En vez de calcular f′(x), usás la pendiente de la recta secante entre los dos puntos: f′ ≈ (f(x₁)−f(x₀)) / (x₁−x₀)",
      },
      {
        label: "Fórmula de actualización",
        text: "x₂ = x₁ − f(x₁) · (x₁−x₀) / (f(x₁)−f(x₀)). Luego x₀ ← x₁, x₁ ← x₂ y repetís.",
      },
      {
        label: "Ventaja vs Newton",
        text: "No necesitás calcular f′(x) analíticamente. La convergencia es superlineal (orden ≈ 1.618, el número áureo), más lenta que Newton pero más flexible.",
      },
    ],
    example:
      "f(x) = x² − x − 2,  x₀=0, x₁=3\nf(0)=−2,  f(3)=4\nx₂ = 3 − 4·(3−0)/(4−(−2)) = 3 − 12/6 = 1.0\nf(1)=−2,  f(3)=4\nx₃ = 3 − 4·(3−1)/(4−(−2)) ≈ 1.667\n⋯ converge a x = 2",
  },
  puntofijo: {
    title: "¿Cómo funciona Punto Fijo?",
    steps: [
      {
        label: "Reformulá la ecuación",
        text: "Partís de f(x) = 0 y la reescribís como x = g(x). Hay muchas formas de despejar, y la elección de g(x) importa mucho.",
      },
      {
        label: "Iterá directamente",
        text: "xₙ₊₁ = g(xₙ). Arrancás desde x₀ y aplicás g repetidamente.",
      },
      {
        label: "Condición de convergencia",
        text: "El método converge si |g′(x)| < 1 en el entorno de la raíz. Si |g′(x)| ≥ 1, diverge. Por eso la elección de g(x) es crítica.",
      },
      {
        label: "Ejemplo de despeje",
        text: "Si f(x) = x²−x−2 = 0, podés despejar x = √(x+2), es decir g(x) = sqrt(x+2). Verificá que |g′(x)| < 1 cerca de la raíz.",
      },
    ],
    example:
      "f(x) = x² − x − 2 = 0\ng(x) = sqrt(x + 2),  x₀ = 1.5\nx₁ = sqrt(1.5 + 2) = sqrt(3.5) ≈ 1.871\nx₂ = sqrt(1.871 + 2) ≈ 1.967\nx₃ = sqrt(1.967 + 2) ≈ 1.992\n⋯ converge lentamente a x = 2",
  },
};

export function GuideAccordion({ methodId }) {
  const [open, setOpen] = useState(false);
  const guide = GUIDES[methodId];

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginTop: 20 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: open ? C.bg : C.surface,
          border: "none",
          padding: "13px 18px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "'DM Mono',monospace",
          transition: "background 0.2s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="1.8">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: C.text }}>{guide.title}</span>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke={C.muted}
          strokeWidth="2"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div style={{ padding: "20px 18px", borderTop: `1px solid ${C.border}`, background: C.bg }}>
          {/* Steps */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {guide.steps.map((step, i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: C.teal,
                      color: "white",
                      fontSize: 9,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontWeight: 600,
                    }}
                  >
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 10, letterSpacing: "1px", color: C.text, fontFamily: "'DM Mono',monospace" }}>{step.label}</span>
                </div>
                <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.75, margin: 0 }}>{step.text}</p>
              </div>
            ))}
          </div>

          {/* Example */}
          <div style={{ background: "#1e2826", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: C.tealLt, marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.tealLt, display: "inline-block" }} />
              Ejemplo paso a paso
            </div>
            <pre style={{ margin: 0, fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.sage, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>
              {guide.example}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
