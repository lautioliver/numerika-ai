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
  s = s.replace(/\bln\b/gi, "__LN__");

  // ── Paso 2: log del usuario → log10 (base 10) ────────────────────────
  s = s.replace(/\blog\b/gi, "log10");

  // ── Paso 3: Expandir tokens ───────────────────────────────────────────
  s = s.replace(/__SIN__/g, "sin");
  s = s.replace(/__LN__/g, "log");  // math.js log = natural

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

// ─── EDO numérica: y' = f(t, y) ─────────────────────────────────────────────

const MAX_ODE_STEPS = 5000;

/**
 * Compila el lado derecho de y' = f(t, y).
 * @param {string} expr - Ej: "y", "-y + t", "sin(t)"
 */
export function parseOdeRhs(expr) {
  try {
    const processed = preprocessExpr(expr);
    const compiled = compile(processed);
    const fn = (t, y) => {
      try {
        const result = compiled.evaluate({ t, y });
        return typeof result === "number" && isFinite(result) ? result : NaN;
      } catch {
        return NaN;
      }
    };
    if (!isFinite(fn(0, 1))) {
      return { fn: null, error: "No se pudo evaluar f(t, y). Revisá la sintaxis." };
    }
    return { fn, error: null };
  } catch (e) {
    return {
      fn: null,
      error: `Expresión inválida: ${e.message || "revisá la sintaxis."}`,
    };
  }
}

function _validateOdeParams(t0, y0, h, tFinal) {
  const t0n = parseFloat(t0);
  const y0n = parseFloat(y0);
  const hn = parseFloat(h);
  const tFn = parseFloat(tFinal);
  if (![t0n, y0n, hn, tFn].every(Number.isFinite)) {
    return { error: "t₀, y₀, h y t final deben ser números válidos." };
  }
  if (hn <= 0) return { error: "El paso h debe ser mayor que 0." };
  if (tFn <= t0n) return { error: "t final debe ser mayor que t₀." };
  const nSteps = Math.ceil((tFn - t0n) / hn);
  if (nSteps > MAX_ODE_STEPS) {
    return { error: `Demasiados pasos (${nSteps}). Aumentá h o reducí el intervalo.` };
  }
  if (nSteps < 1) return { error: "El intervalo es demasiado corto para al menos un paso." };
  return { t0: t0n, y0: y0n, h: hn, tFinal: tFn, nSteps };
}

function _fmt(n, dec = 6) {
  return +Number(n).toFixed(dec);
}

/**
 * Método de Euler explícito para y' = f(t, y).
 */
export function edoEuler(rhsExpr, t0, y0, h, tFinal) {
  const { fn, error: parseErr } = parseOdeRhs(rhsExpr);
  if (parseErr) return { error: parseErr };

  const params = _validateOdeParams(t0, y0, h, tFinal);
  if (params.error) return { error: params.error };

  const { t0: tStart, y0: yStart, h: step, tFinal: tEnd, nSteps } = params;
  const points = [{ t: _fmt(tStart), y: _fmt(yStart) }];
  const iterations = [{
    n: 0,
    t: _fmt(tStart),
    y: _fmt(yStart),
    f: _fmt(fn(tStart, yStart)),
    detail: "—",
    yNext: _fmt(yStart),
  }];

  let t = tStart;
  let y = yStart;

  for (let n = 1; n <= nSteps; n++) {
    const f = fn(t, y);
    if (!isFinite(f)) {
      return {
        error: `f(t, y) no es finita en t = ${t.toFixed(4)}, y = ${y.toFixed(4)}.`,
        points,
        iterations,
        method: "euler",
      };
    }
    const yNext = y + step * f;
    const tNext = t + step;
    iterations.push({
      n,
      t: _fmt(t),
      y: _fmt(y),
      f: _fmt(f),
      detail: `h·f = ${_fmt(step * f)}`,
      yNext: _fmt(yNext),
    });
    y = yNext;
    t = tNext;
    points.push({ t: _fmt(t), y: _fmt(y) });
  }

  return {
    method: "euler",
    methodLabel: "Euler",
    rhs: rhsExpr,
    t0: tStart,
    y0: yStart,
    h: step,
    tFinal: tEnd,
    yFinal: _fmt(y),
    totalSteps: nSteps,
    points,
    iterations,
    converged: true,
  };
}

/**
 * Runge-Kutta clásico de 4º orden para y' = f(t, y).
 */
export function edoRK4(rhsExpr, t0, y0, h, tFinal) {
  const { fn, error: parseErr } = parseOdeRhs(rhsExpr);
  if (parseErr) return { error: parseErr };

  const params = _validateOdeParams(t0, y0, h, tFinal);
  if (params.error) return { error: params.error };

  const { t0: tStart, y0: yStart, h: step, tFinal: tEnd, nSteps } = params;
  const points = [{ t: _fmt(tStart), y: _fmt(yStart) }];
  const iterations = [{
    n: 0,
    t: _fmt(tStart),
    y: _fmt(yStart),
    k1: _fmt(fn(tStart, yStart)),
    k2: null,
    k3: null,
    k4: null,
    yNext: _fmt(yStart),
  }];

  let t = tStart;
  let y = yStart;

  for (let n = 1; n <= nSteps; n++) {
    const k1 = fn(t, y);
    const k2 = fn(t + step / 2, y + (step * k1) / 2);
    const k3 = fn(t + step / 2, y + (step * k2) / 2);
    const k4 = fn(t + step, y + step * k3);

    if (![k1, k2, k3, k4].every(isFinite)) {
      return {
        error: `Evaluación no finita en el paso ${n}.`,
        points,
        iterations,
        method: "rk4",
      };
    }

    const yNext = y + (step / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    const tNext = t + step;

    iterations.push({
      n,
      t: _fmt(t),
      y: _fmt(y),
      k1: _fmt(k1),
      k2: _fmt(k2),
      k3: _fmt(k3),
      k4: _fmt(k4),
      yNext: _fmt(yNext),
    });

    y = yNext;
    t = tNext;
    points.push({ t: _fmt(t), y: _fmt(y) });
  }

  return {
    method: "rk4",
    methodLabel: "Runge-Kutta 4",
    rhs: rhsExpr,
    t0: tStart,
    y0: yStart,
    h: step,
    tFinal: tEnd,
    yFinal: _fmt(y),
    totalSteps: nSteps,
    points,
    iterations,
    converged: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRACIÓN POR APROXIMACIÓN — Trapecio · Simpson 1/3 · Simpson 3/8
// ═══════════════════════════════════════════════════════════════════════════

const MAX_INT_SUBINTERVALS = 5000;

/**
 * Valida y parsea los parámetros comunes para integración numérica.
 */
function _validateIntegrationParams(expr, a, b, n, options = {}) {
  const an = parseFloat(a);
  const bn = parseFloat(b);
  const nn = parseInt(n, 10);
  if (![an, bn].every(Number.isFinite)) {
    return { error: "Los límites a y b deben ser números válidos." };
  }
  if (!Number.isFinite(nn) || nn < 1) {
    return { error: "El número de subintervalos n debe ser un entero ≥ 1." };
  }
  if (nn > MAX_INT_SUBINTERVALS) {
    return { error: `Demasiados subintervalos (${nn}). Máximo permitido: ${MAX_INT_SUBINTERVALS}.` };
  }
  if (Math.abs(bn - an) < 1e-12) {
    return { error: "El intervalo [a, b] no puede ser de longitud cero." };
  }
  if (options.evenN && nn % 2 !== 0) {
    return { error: "Simpson 1/3 requiere que n sea par. Probá con un valor par." };
  }
  if (options.multipleOf3 && nn % 3 !== 0) {
    return { error: "Simpson 3/8 requiere que n sea múltiplo de 3." };
  }

  const { fn, error: parseErr } = parseFunction(expr);
  if (parseErr) return { error: parseErr };

  // Orientación: si a > b, invertimos y aplicamos signo
  const flipped = an > bn;
  const lo = flipped ? bn : an;
  const hi = flipped ? an : bn;
  const h = (hi - lo) / nn;

  return { fn, a: lo, b: hi, n: nn, h, sign: flipped ? -1 : 1, originalA: an, originalB: bn };
}

/**
 * Construye una grilla {x, y} para Recharts (curva continua de f en [a, b]).
 */
function _buildCurvePoints(fn, a, b, samples = 200) {
  const points = [];
  if (samples < 2) samples = 2;
  const step = (b - a) / (samples - 1);
  for (let i = 0; i < samples; i++) {
    const x = a + i * step;
    const y = fn(x);
    points.push({ x: _fmt(x), y: Number.isFinite(y) ? _fmt(y) : null });
  }
  return points;
}

/**
 * Método del Trapecio compuesto.
 *
 * I ≈ (h/2)·[f(x₀) + 2·Σf(xᵢ) + f(xₙ)]
 * Error global: O(h²).
 */
export function trapecio(expr, a, b, n) {
  const params = _validateIntegrationParams(expr, a, b, n);
  if (params.error) return { error: params.error };

  const { fn, a: aN, b: bN, n: nN, h, sign } = params;

  const fValues = [];
  for (let i = 0; i <= nN; i++) {
    const x = aN + i * h;
    const y = fn(x);
    if (!Number.isFinite(y)) {
      return { error: `f(x) no es finita en x = ${x.toFixed(4)}. Revisá el intervalo.` };
    }
    fValues.push({ i, x, fx: y });
  }

  // Suma compuesta y filas de detalle (subintervalos)
  const iterations = [];
  let sumInterior = 0;
  for (let i = 0; i < nN; i++) {
    const left = fValues[i];
    const right = fValues[i + 1];
    const subarea = (h / 2) * (left.fx + right.fx);
    if (i > 0 && i < nN) sumInterior += left.fx;
    iterations.push({
      i: i + 1,
      xLeft: _fmt(left.x),
      xRight: _fmt(right.x),
      fLeft: _fmt(left.fx),
      fRight: _fmt(right.fx),
      subarea: _fmt(subarea),
    });
  }
  // sumInterior recalculado correctamente: f(x₁)…f(xₙ₋₁)
  sumInterior = 0;
  for (let i = 1; i < nN; i++) sumInterior += fValues[i].fx;

  const integral = sign * (h / 2) * (fValues[0].fx + 2 * sumInterior + fValues[nN].fx);

  const nodePoints = fValues.map((v) => ({
    x: _fmt(v.x),
    y: _fmt(v.fx),
    i: v.i,
  }));

  return {
    method: "trapecio",
    methodLabel: "Trapecio compuesto",
    expression: expr,
    a: params.originalA,
    b: params.originalB,
    n: nN,
    h: _fmt(h),
    order: "O(h²)",
    integral: _fmt(integral, 8),
    summary: {
      f0: _fmt(fValues[0].fx),
      fn: _fmt(fValues[nN].fx),
      sumInterior: _fmt(sumInterior),
      formula: "(h/2)·[f(x₀) + 2·Σf(xᵢ) + f(xₙ)]",
    },
    iterations,
    nodePoints,
    curvePoints: _buildCurvePoints(fn, aN, bN),
  };
}

/**
 * Simpson 1/3 compuesto.
 *
 * I ≈ (h/3)·[f(x₀) + 4·Σ(impares) + 2·Σ(pares) + f(xₙ)]
 * Requiere n par. Error global: O(h⁴).
 */
export function simpson13(expr, a, b, n) {
  const params = _validateIntegrationParams(expr, a, b, n, { evenN: true });
  if (params.error) return { error: params.error };

  const { fn, a: aN, b: bN, n: nN, h, sign } = params;

  const fValues = [];
  for (let i = 0; i <= nN; i++) {
    const x = aN + i * h;
    const y = fn(x);
    if (!Number.isFinite(y)) {
      return { error: `f(x) no es finita en x = ${x.toFixed(4)}.` };
    }
    fValues.push({ i, x, fx: y });
  }

  let sumOdd = 0;
  let sumEven = 0;
  for (let i = 1; i < nN; i++) {
    if (i % 2 === 1) sumOdd += fValues[i].fx;
    else sumEven += fValues[i].fx;
  }

  // Pares de subintervalos (Simpson trabaja de a 2 paneles)
  const iterations = [];
  for (let i = 0; i < nN; i += 2) {
    const x0 = fValues[i];
    const x1 = fValues[i + 1];
    const x2 = fValues[i + 2];
    const panel = (h / 3) * (x0.fx + 4 * x1.fx + x2.fx);
    iterations.push({
      i: i / 2 + 1,
      xLeft: _fmt(x0.x),
      xMid: _fmt(x1.x),
      xRight: _fmt(x2.x),
      fLeft: _fmt(x0.fx),
      fMid: _fmt(x1.fx),
      fRight: _fmt(x2.fx),
      subarea: _fmt(panel),
    });
  }

  const integral = sign * (h / 3) * (fValues[0].fx + 4 * sumOdd + 2 * sumEven + fValues[nN].fx);

  const nodePoints = fValues.map((v) => ({
    x: _fmt(v.x),
    y: _fmt(v.fx),
    i: v.i,
    role: v.i === 0 || v.i === nN ? "extremo" : v.i % 2 === 1 ? "impar" : "par",
  }));

  return {
    method: "simpson13",
    methodLabel: "Simpson 1/3 compuesto",
    expression: expr,
    a: params.originalA,
    b: params.originalB,
    n: nN,
    h: _fmt(h),
    order: "O(h⁴)",
    integral: _fmt(integral, 8),
    summary: {
      f0: _fmt(fValues[0].fx),
      fn: _fmt(fValues[nN].fx),
      sumOdd: _fmt(sumOdd),
      sumEven: _fmt(sumEven),
      formula: "(h/3)·[f(x₀) + 4·Σ(impares) + 2·Σ(pares) + f(xₙ)]",
    },
    iterations,
    nodePoints,
    curvePoints: _buildCurvePoints(fn, aN, bN),
  };
}

/**
 * Simpson 3/8 compuesto.
 *
 * I ≈ (3h/8)·[f(x₀) + 3·Σ(no múltiplos de 3) + 2·Σ(múltiplos de 3) + f(xₙ)]
 * Requiere n múltiplo de 3. Error global: O(h⁴).
 */
export function simpson38(expr, a, b, n) {
  const params = _validateIntegrationParams(expr, a, b, n, { multipleOf3: true });
  if (params.error) return { error: params.error };

  const { fn, a: aN, b: bN, n: nN, h, sign } = params;

  const fValues = [];
  for (let i = 0; i <= nN; i++) {
    const x = aN + i * h;
    const y = fn(x);
    if (!Number.isFinite(y)) {
      return { error: `f(x) no es finita en x = ${x.toFixed(4)}.` };
    }
    fValues.push({ i, x, fx: y });
  }

  let sumNon3 = 0;
  let sum3 = 0;
  for (let i = 1; i < nN; i++) {
    if (i % 3 === 0) sum3 += fValues[i].fx;
    else sumNon3 += fValues[i].fx;
  }

  // Cada tripleta de subintervalos forma un panel de 3/8
  const iterations = [];
  for (let i = 0; i < nN; i += 3) {
    const x0 = fValues[i];
    const x1 = fValues[i + 1];
    const x2 = fValues[i + 2];
    const x3 = fValues[i + 3];
    const panel = (3 * h / 8) * (x0.fx + 3 * x1.fx + 3 * x2.fx + x3.fx);
    iterations.push({
      i: i / 3 + 1,
      x0: _fmt(x0.x),
      x1: _fmt(x1.x),
      x2: _fmt(x2.x),
      x3: _fmt(x3.x),
      f0: _fmt(x0.fx),
      f1: _fmt(x1.fx),
      f2: _fmt(x2.fx),
      f3: _fmt(x3.fx),
      subarea: _fmt(panel),
    });
  }

  const integral = sign * (3 * h / 8) * (fValues[0].fx + 3 * sumNon3 + 2 * sum3 + fValues[nN].fx);

  const nodePoints = fValues.map((v) => ({
    x: _fmt(v.x),
    y: _fmt(v.fx),
    i: v.i,
    role: v.i === 0 || v.i === nN ? "extremo" : v.i % 3 === 0 ? "x3" : "non3",
  }));

  return {
    method: "simpson38",
    methodLabel: "Simpson 3/8 compuesto",
    expression: expr,
    a: params.originalA,
    b: params.originalB,
    n: nN,
    h: _fmt(h),
    order: "O(h⁴)",
    integral: _fmt(integral, 8),
    summary: {
      f0: _fmt(fValues[0].fx),
      fn: _fmt(fValues[nN].fx),
      sumNon3: _fmt(sumNon3),
      sum3: _fmt(sum3),
      formula: "(3h/8)·[f(x₀) + 3·Σ(no múltiplos de 3) + 2·Σ(múltiplos de 3) + f(xₙ)]",
    },
    iterations,
    nodePoints,
    curvePoints: _buildCurvePoints(fn, aN, bN),
  };
}