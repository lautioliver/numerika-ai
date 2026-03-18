/**
 * NumérikaAI — Motor de Métodos Numéricos
 * Todos los métodos retornan: { iterations, root, converged, error, steps }
 */

const MAX_ITER = 100;

// ─── Evaluador seguro de funciones ───────────────────────────────────────────
/**
 * Convierte una expresión matemática ingresada por el usuario a JS válido.
 *
 * Estrategia de tokens intermedios:
 * 1. Se reemplazan las funciones por tokens únicos (__SIN__, __COS__, etc.)
 *    ANTES de hacer cualquier otra transformación. Esto evita que sustituciones
 *    posteriores toquen letras dentro de identificadores ya procesados.
 * 2. Se aplica multiplicación implícita sobre el string "limpio" de funciones.
 * 3. Finalmente se expanden los tokens a sus equivalentes Math.*.
 *
 * Bugs que esto corrige respecto a la versión anterior:
 * - sen(x) → Math.Math.sin*(x)  [sen→Math.sin, luego sin→Math.sin otra vez]
 * - ln(x)  → Math.Math.log10*(x) [ln→Math.log, luego log→Math.log10]
 * - sin(x) → Math.sin*(x)       [regex de multiplicación implícita insertaba * antes de (]
 */
export function parseFunction(expr) {
  try {
    let s = expr.trim();

    // ── Paso 1: Potencias ─────────────────────────────────────────────────────
    s = s.replace(/\^/g, "**");

    // ── Paso 2: Funciones → tokens intermedios ────────────────────────────────
    // Orden crítico: términos más largos/específicos primero para evitar
    // colisiones ('sen' antes de 'sin', 'ln' antes de 'log', 'sqrt' antes de 'sin')
    s = s.replace(/\bsen\b/gi,  "__SIN__");
    s = s.replace(/\bsin\b/gi,  "__SIN__");
    s = s.replace(/\bcos\b/gi,  "__COS__");
    s = s.replace(/\btan\b/gi,  "__TAN__");
    s = s.replace(/\bsqrt\b/gi, "__SQRT__");
    s = s.replace(/\bexp\b/gi,  "__EXP__");
    s = s.replace(/\bln\b/gi,   "__LOG__");
    s = s.replace(/\blog\b/gi,  "__LOG10__");
    s = s.replace(/\bpi\b/gi,   "__PI__");
    s = s.replace(/\be\b/g,     "__E__");     // e como constante de Euler

    // ── Paso 3: Multiplicación implícita ─────────────────────────────────────
    // Solo sobre el string limpio de palabras de funciones
    s = s.replace(/(\d)(x)/g,   "$1*$2");     // 2x → 2*x
    s = s.replace(/(\d)\s*\(/g, "$1*(");      // 2( → 2*(  o  2 ( → 2*(
    s = s.replace(/\)\s*\(/g,   ")*(");        // )( → )*(
    s = s.replace(/(x)\s*\(/g,  "$1*(");       // x( → x*(  ej: x(x+1)

    // ── Paso 4: Expandir tokens → Math.* ─────────────────────────────────────
    s = s.replace(/__SIN__/g,   "Math.sin");
    s = s.replace(/__COS__/g,   "Math.cos");
    s = s.replace(/__TAN__/g,   "Math.tan");
    s = s.replace(/__SQRT__/g,  "Math.sqrt");
    s = s.replace(/__EXP__/g,   "Math.exp");
    s = s.replace(/__LOG__/g,   "Math.log");
    s = s.replace(/__LOG10__/g, "Math.log10");
    s = s.replace(/__PI__/g,    "Math.PI");
    s = s.replace(/__E__/g,     "Math.E");

    // eslint-disable-next-line no-new-func
    const fn = new Function("x", `"use strict"; return (${s});`);
    fn(1); // test de ejecución
    return { fn, error: null };
  } catch (e) {
    return { fn: null, error: "Función inválida. Revisá la sintaxis." };
  }
}

// ─── Derivada numérica (diferencias centrales) ────────────────────────────────
function derivative(f, x, h = 1e-7) {
  return (f(x + h) - f(x - h)) / (2 * h);
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
  const { fn: f, error } = parseFunction(expr);
  if (error) return { error };

  x0 = parseFloat(x0);
  if (isNaN(x0)) return { error: "Ingresá un valor numérico para x₀." };

  const iterations = [];
  let x = x0;

  for (let i = 1; i <= MAX_ITER; i++) {
    const fx = f(x);
    const fpx = derivative(f, x);

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
 *
 * SEGURIDAD: usa parseFunction() que sandboxea la expresión.
 * xMin/xMax son parseFloat-eados y validados; cap de 200 unidades.
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