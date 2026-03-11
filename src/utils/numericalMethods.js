/**
 * NumérikaAI — Motor de Métodos Numéricos
 * Todos los métodos retornan: { iterations, root, converged, error, steps }
 */

const MAX_ITER = 100;

// ─── Evaluador seguro de funciones ───────────────────────────────────────────
export function parseFunction(expr) {
  // Reemplaza notación matemática común a JS válido
  const sanitized = expr
    .replace(/\^/g, "**")
    .replace(/(\d)(x)/g, "$1*$2")
    .replace(/([a-z)])\s*\(/g, "$1*(")
    .replace(/sen/gi, "Math.sin")
    .replace(/sin/gi, "Math.sin")
    .replace(/cos/gi, "Math.cos")
    .replace(/tan/gi, "Math.tan")
    .replace(/ln/gi, "Math.log")
    .replace(/log/gi, "Math.log10")
    .replace(/sqrt/gi, "Math.sqrt")
    .replace(/exp/gi, "Math.exp")
    .replace(/pi/gi, "Math.PI")
    .replace(/e(?![a-z])/g, "Math.E");

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("x", `"use strict"; return (${sanitized});`);
    fn(1); // test
    return { fn, error: null };
  } catch (e) {
    return { fn: null, error: "Función inválida. Revisá la sintaxis." };
  }
}

// Derivada numérica (diferencias centrales)
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

  return { iterations, root: +(( a + b) / 2).toFixed(8), converged: false, totalIter: MAX_ITER };
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
export function getPoints(expr, xMin, xMax, n = 200) {
  const { fn: f, error } = parseFunction(expr);
  if (error) return [];

  const pts = [];
  for (let i = 0; i <= n; i++) {
    const x = xMin + (i * (xMax - xMin)) / n;
    try {
      const y = f(x);
      pts.push({ x: +x.toFixed(3), y: isFinite(y) && Math.abs(y) < 1e5 ? +y.toFixed(5) : null });
    } catch {
      pts.push({ x: +x.toFixed(3), y: null });
    }
  }
  return pts;
}
