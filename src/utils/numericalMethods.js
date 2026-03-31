/**
 * NumérikaAI — Motor de Métodos Numéricos
 * 
 * Usa math.js para evaluar expresiones de forma segura (sin new Function).
 * Soporta derivada simbólica para Newton-Raphson con fallback numérico.
 * 
 * Todos los métodos retornan: { iterations, root, converged, totalIter, error }
 */

import { compile, derivative as mathDerivative } from "mathjs";

const MAX_ITER = 100;

// ─── Preprocesador de expresiones ────────────────────────────────────────────
/**
 * Normaliza una expresión del usuario al formato que math.js entiende.
 * 
 * Convierte:
 * - sen(x)  → sin(x)    [español → inglés]
 * - ln(x)   → log(x)    [ln = log natural en math.js]
 * - log(x)  → log10(x)  [log del usuario = base 10]
 * - 2x      → 2*x       [multiplicación implícita]
 */
function preprocessExpr(expr) {
  let s = expr.trim();

  // ── Paso 1: Funciones → tokens (evitar colisiones) ────────────────────
  s = s.replace(/\bsen\b/gi, "__SIN__");
  s = s.replace(/\bln\b/gi,  "__LN__");

  // ── Paso 2: log del usuario → log10 (base 10) ────────────────────────
  s = s.replace(/\blog\b/gi, "log10");

  // ── Paso 3: Expandir tokens ───────────────────────────────────────────
  s = s.replace(/__SIN__/g, "sin");
  s = s.replace(/__LN__/g,  "log");  // math.js log = natural

  return s;
}

// ─── Evaluador seguro de funciones ───────────────────────────────────────────
/**
 * Compila una expresión matemática usando math.js (sandbox seguro).
 * Retorna la función evaluable y, si es posible, su derivada simbólica.
 * 
 * @param {string} expr - Expresión del usuario (ej: "x^2 - x - 2")
 * @returns {{ fn, derivativeFn, error }}
 */
export function parseFunction(expr) {
  try {
    const processed = preprocessExpr(expr);
    const compiled = compile(processed);

    // Función principal f(x)
    const fn = (x) => {
      try {
        const result = compiled.evaluate({ x });
        return typeof result === "number" ? result : NaN;
      } catch {
        return NaN;
      }
    };

    // Intentar derivada simbólica
    let derivativeFn = null;
    try {
      const derived = mathDerivative(processed, "x");
      const compiledDeriv = derived.compile();
      derivativeFn = (x) => {
        try {
          const result = compiledDeriv.evaluate({ x });
          return typeof result === "number" ? result : NaN;
        } catch {
          return NaN;
        }
      };
    } catch {
      // Derivada simbólica no disponible para esta expresión
      // Se usará derivada numérica como fallback
    }

    // Test de ejecución
    const testVal = fn(1);
    if (typeof testVal !== "number") {
      return { fn: null, derivativeFn: null, error: "Función inválida. Revisá la sintaxis." };
    }

    return { fn, derivativeFn, error: null };
  } catch (e) {
    return {
      fn: null,
      derivativeFn: null,
      error: `Función inválida: ${e.message || "revisá la sintaxis."}`,
    };
  }
}

// ─── Derivada numérica (fallback — diferencias centrales) ─────────────────────
function numericalDerivative(f, x, h = 1e-7) {
  return (f(x + h) - f(x - h)) / (2 * h);
}

/**
 * Calcula la derivada de f en el punto x.
 * Usa derivada simbólica si está disponible, sino numérica.
 * 
 * @param {Function} f - Función evaluable
 * @param {number} x - Punto donde evaluar
 * @param {Function|null} derivativeFn - Derivada simbólica (de parseFunction)
 */
function getDerivative(f, x, derivativeFn) {
  if (derivativeFn) {
    const result = derivativeFn(x);
    if (isFinite(result)) return result;
  }
  // Fallback numérico
  return numericalDerivative(f, x);
}

// ─── 1. BISECCIÓN ─────────────────────────────────────────────────────────────
export function biseccion(expr, a, b, tol = 1e-6) {
  const { fn: f, error } = parseFunction(expr);
  if (error) return { error };

  a = parseFloat(a); b = parseFloat(b);
  if (isNaN(a) || isNaN(b)) return { error: "Ingresá valores numéricos para a y b." };
  if (f(a) * f(b) >= 0) return { error: "f(a) y f(b) deben tener signos opuestos. [f(a)·f(b) < 0]" };

  const iterations = [];
  let prev_c = null;

  for (let i = 1; i <= MAX_ITER; i++) {
    const c = (a + b) / 2;
    const fc = f(c);
    const fa = f(a);
    const err = prev_c !== null ? Math.abs((c - prev_c) / c) * 100 : null;

    iterations.push({
      n: i, a: +a.toFixed(6), b: +b.toFixed(6),
      c: +c.toFixed(6), fc: +fc.toFixed(6),
      err: err !== null ? +err.toFixed(4) : null,
      converged: err !== null && err < tol * 100,
    });

    if (Math.abs(fc) < 1e-12 || (err !== null && err < tol * 100)) {
      return { iterations, root: +c.toFixed(8), converged: true, totalIter: i };
    }

    if (fa * fc < 0) b = c;
    else a = c;
    prev_c = c;
  }

  return { iterations, root: +((a + b) / 2).toFixed(8), converged: false, totalIter: MAX_ITER };
}

// ─── 2. REGLA FALSA ───────────────────────────────────────────────────────────
export function reglaFalsa(expr, a, b, tol = 1e-6) {
  const { fn: f, error } = parseFunction(expr);
  if (error) return { error };

  a = parseFloat(a); b = parseFloat(b);
  if (isNaN(a) || isNaN(b)) return { error: "Ingresá valores numéricos para a y b." };
  if (f(a) * f(b) >= 0) return { error: "f(a) y f(b) deben tener signos opuestos. [f(a)·f(b) < 0]" };

  const iterations = [];
  let prev_c = null;

  for (let i = 1; i <= MAX_ITER; i++) {
    const fa = f(a), fb = f(b);
    const c = b - (fb * (b - a)) / (fb - fa);
    const fc = f(c);
    const err = prev_c !== null ? Math.abs((c - prev_c) / c) * 100 : null;

    iterations.push({
      n: i, a: +a.toFixed(6), b: +b.toFixed(6),
      c: +c.toFixed(6), fc: +fc.toFixed(6),
      err: err !== null ? +err.toFixed(4) : null,
      converged: err !== null && err < tol * 100,
    });

    if (Math.abs(fc) < 1e-12 || (err !== null && err < tol * 100)) {
      return { iterations, root: +c.toFixed(8), converged: true, totalIter: i };
    }

    if (fa * fc < 0) b = c;
    else a = c;
    prev_c = c;
  }

  return { iterations, root: null, converged: false, totalIter: MAX_ITER };
}

// ─── 3. NEWTON-RAPHSON ────────────────────────────────────────────────────────
export function newtonRaphson(expr, x0, tol = 1e-6) {
  const { fn: f, derivativeFn, error } = parseFunction(expr);
  if (error) return { error };

  x0 = parseFloat(x0);
  if (isNaN(x0)) return { error: "Ingresá un valor numérico para x₀." };

  const iterations = [];
  let x = x0;

  for (let i = 1; i <= MAX_ITER; i++) {
    const fx = f(x);
    const fpx = getDerivative(f, x, derivativeFn);

    if (Math.abs(fpx) < 1e-12) return { error: "Derivada ≈ 0. El método no puede continuar en x = " + x.toFixed(4) };

    const x1 = x - fx / fpx;
    const err = Math.abs((x1 - x) / x1) * 100;

    iterations.push({
      n: i,
      x: +x.toFixed(6),
      fx: +fx.toFixed(6),
      fpx: +fpx.toFixed(6),
      x1: +x1.toFixed(6),
      err: +err.toFixed(4),
      converged: err < tol * 100,
    });

    if (err < tol * 100 || Math.abs(fx) < 1e-12) {
      return { iterations, root: +x1.toFixed(8), converged: true, totalIter: i };
    }
    x = x1;
  }

  return { iterations, root: +x.toFixed(8), converged: false, totalIter: MAX_ITER };
}

// ─── 4. SECANTE ───────────────────────────────────────────────────────────────
export function secante(expr, x0, x1, tol = 1e-6) {
  const { fn: f, error } = parseFunction(expr);
  if (error) return { error };

  x0 = parseFloat(x0); x1 = parseFloat(x1);
  if (isNaN(x0) || isNaN(x1)) return { error: "Ingresá valores numéricos para x₀ y x₁." };

  const iterations = [];
  let xPrev = x0, xCurr = x1;

  for (let i = 1; i <= MAX_ITER; i++) {
    const f0 = f(xPrev), f1 = f(xCurr);
    if (Math.abs(f1 - f0) < 1e-12) return { error: "f(x₁) ≈ f(x₀). División por cero." };

    const x2 = xCurr - f1 * (xCurr - xPrev) / (f1 - f0);
    const err = Math.abs((x2 - xCurr) / x2) * 100;

    iterations.push({
      n: i,
      x0: +xPrev.toFixed(6),
      x1: +xCurr.toFixed(6),
      x2: +x2.toFixed(6),
      fx2: +f(x2).toFixed(6),
      err: +err.toFixed(4),
      converged: err < tol * 100,
    });

    if (err < tol * 100) {
      return { iterations, root: +x2.toFixed(8), converged: true, totalIter: i };
    }
    xPrev = xCurr;
    xCurr = x2;
  }

  return { iterations, root: +xCurr.toFixed(8), converged: false, totalIter: MAX_ITER };
}

// ─── 5. PUNTO FIJO ────────────────────────────────────────────────────────────
export function puntoFijo(exprG, x0, tol = 1e-6) {
  const { fn: g, error } = parseFunction(exprG);
  if (error) return { error };

  x0 = parseFloat(x0);
  if (isNaN(x0)) return { error: "Ingresá un valor numérico para x₀." };

  const iterations = [];
  let x = x0;

  for (let i = 1; i <= MAX_ITER; i++) {
    let gx;
    try { gx = g(x); } catch { return { error: "Error al evaluar g(x) en x = " + x }; }

    if (!isFinite(gx)) return { error: `g(x) diverge en iteración ${i}. Revisá g(x).` };

    const err = Math.abs((gx - x) / gx) * 100;

    iterations.push({
      n: i,
      x: +x.toFixed(6),
      gx: +gx.toFixed(6),
      err: +err.toFixed(4),
      converged: err < tol * 100,
    });

    if (err < tol * 100) {
      return { iterations, root: +gx.toFixed(8), converged: true, totalIter: i };
    }

    if (Math.abs(gx) > 1e10) return { error: "El método diverge. Intentá con otro x₀ o reformulá g(x)." };
    x = gx;
  }

  return { iterations, root: +x.toFixed(8), converged: false, totalIter: MAX_ITER };
}

// ─── Datos para graficar f(x) ─────────────────────────────────────────────────
export function getFunctionPoints(expr, xMin, xMax, n = 200) {
  const { fn: f, error } = parseFunction(expr);
  if (error) return [];

  const points = [];
  const step = (xMax - xMin) / n;
  for (let i = 0; i <= n; i++) {
    const x = xMin + i * step;
    try {
      const y = f(x);
      if (isFinite(y) && Math.abs(y) < 1e6) points.push({ x: +x.toFixed(4), y: +y.toFixed(4) });
      else points.push({ x: +x.toFixed(4), y: null });
    } catch {
      points.push({ x: +x.toFixed(4), y: null });
    }
  }
  return points;
}

// ─── Detector de raíces múltiples ─────────────────────────────────────────────
/**
 * Escanea [xMin, xMax] buscando cambios de signo en f(x).
 * Cada cambio de signo indica una raíz en ese subintervalo.
 * Retorna { count, intervals: [{ a, b }] }
 */
export function detectMultipleRoots(expr, xMin, xMax, step = 0.1) {
  const { fn: f, error } = parseFunction(expr);
  if (error) return { count: 0, intervals: [] };

  xMin = parseFloat(xMin);
  xMax = parseFloat(xMax);
  if (!isFinite(xMin) || !isFinite(xMax) || xMin >= xMax) return { count: 0, intervals: [] };
  if (xMax - xMin > 200) xMax = xMin + 200;

  const intervals = [];
  let x = xMin;

  while (x < xMax - step) {
    const x1 = +(x + step).toFixed(10);
    try {
      const fa = f(x);
      const fb = f(x1);
      if (isFinite(fa) && isFinite(fb) && fa * fb < 0) {
        intervals.push({ a: +x.toFixed(2), b: +x1.toFixed(2) });
      }
    } catch { /* punto singular, se ignora */ }
    x = x1;
  }

  return { count: intervals.length, intervals };
}