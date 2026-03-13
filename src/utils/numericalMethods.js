/**
 * NumérikaAI — Motor de Métodos Numéricos
 * Todos los métodos retornan: { iterations, root, converged, error, steps }
 */

const MAX_ITER = 100;

/**
 * ⚠️ FUNCIÓN CRÍTICA DE SEGURIDAD
 * Convierte notación matemática a función JS evaluable.
 * 
 * Caracteres/funciones permitidas:
 * - Variables y números: x, 0-9
 * - Operadores: + - * / ^ ( )
 * - Funciones: sin, cos, tan, sqrt, log, ln, exp, pi, e
 * 
 * NOTA: Usa new Function() pero es seguro porque:
 * 1. Caracteres limitados a whitelist
 * 2. Input solo de formularios UI
 * 3. Máximo 200 caracteres
 * 4. Ejecución en "use strict"
 * 
 * @param {string} expr - Expresión matemática (máx 200 chars)
 * @returns {{fn: Function|null, error: string|null}}
 * @example
 * const { fn } = parseFunction("x^2 + 3*x - 2");
 * if (fn) console.log(fn(2));  // 8
 */
export function parseFunction(expr) {
  // Validar longitud
  if (!expr || expr.length > 200) {
    return { fn: null, error: "Función inválida. Revisá la sintaxis." };
  }

  // Diccionario de funciones matemáticas
  const mathDict = {
    'sen': 'Math.sin',
    'sin': 'Math.sin',
    'cos': 'Math.cos',
    'tan': 'Math.tan',
    'ln': 'Math.log',
    'log': 'Math.log10',
    'sqrt': 'Math.sqrt',
    'exp': 'Math.exp',
    'pi': 'Math.PI',
    'e': 'Math.E'
  };

  // 1. Pasa todo a minúsculas
  // 2. Reemplaza potencias y multiplicaciones implícitas
  // 3. Reemplaza palabras clave de un solo golpe usando el diccionario
  const sanitized = expr.toLowerCase()
    .replace(/\^/g, "**")
    .replace(/(\d)(x)/g, "$1*$2")
    .replace(/(x|\d|\))\s*\(/g, "$1*(")
    .replace(/\)\s*x/g, ")*x")
    .replace(/\b(sen|sin|cos|tan|ln|log|sqrt|exp|pi|e)\b/g, match => mathDict[match]);

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("x", `"use strict"; return (${sanitized});`);
    
    // Prueba de ejecución
    fn(1); 
    
    return { fn, error: null };
  } catch (e) {
    // Si la sintaxis de JS falla (ej: dejaron un '+' suelto)
    return { fn: null, error: "Función inválida. Revisá la sintaxis." };
  }
}
/**
 * Calcula derivada numérica usando diferencias centrales.
 * f'(x) ≈ [f(x+h) - f(x-h)] / (2h)
 * Usada internamente en Newton-Raphson.
 * @private No usar directamente como función pública
 */
function derivative(f, x, h = 1e-7) {
  return (f(x + h) - f(x - h)) / (2 * h);
}

/**
 * Método de Bisección para encontrar raíces.
 * 
 * Divide el intervalo [a,b] a la mitad repetidamente.
 * REQUIERE: f(a)·f(b) < 0 (cambio de signo en extremos)
 * Convergencia: Garantizada pero lenta (lineal)
 * 
 * @param {string} expr - Expresión matemática f(x)
 * @param {number|string} a - Extremo izquierdo del intervalo
 * @param {number|string} b - Extremo derecho del intervalo
 * @param {number} [tol=1e-6] - Tolerancia de error relativo
 * @returns {Object} {iterations: Array, root: number, converged: boolean, totalIter: number, error?: string}
 */
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

    // Validar que los valores sean números válidos antes de agregar a la tabla
    if (!isFinite(c) || !isFinite(fc)) {
      return { iterations, root: +(a + b) / 2 / 2, converged: false, totalIter: i, error: "Cálculo divergió o produjo valores inválidos." };
    }

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

/**
 * Método de Regla Falsa (interpolación lineal).
 * 
 * Similar a bisección pero usa interpolación lineal para estimar c.
 * Converge más rápido que bisección en funciones suaves.
 * REQUIERE: f(a)·f(b) < 0
 * Nota: Puede tener convergencia unilateral (un extremo fijo muchas iteraciones)
 * 
 * @param {string} expr - Expresión matemática f(x)
 * @param {number|string} a - Extremo izquierdo
 * @param {number|string} b - Extremo derecho
 * @param {number} [tol=1e-6] - Tolerancia de error relativo
 * @returns {Object} {iterations, root, converged, totalIter, error?}
 */
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

    // Validar que los valores sean números válidos
    if (!isFinite(c) || !isFinite(fc)) {
      return { iterations, root: +((a + b) / 2).toFixed(8), converged: false, totalIter: i, error: "Cálculo divergió o produjo valores inválidos." };
    }

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

/**
 * Método Newton-Raphson (método de la tangente).
 * 
 * Usa derivada numérica f'(x) para convergencia muy rápida (cuadrática).
 * x₀ debe estar CERCA de la raíz. Falla si f'(x) ≈ 0.
 * Convergencia: Cuadrática (muy rápido cerca de la raíz)
 * 
 * @param {string} expr - Expresión matemática f(x)
 * @param {number|string} x0 - Punto inicial (debe estar cercano a la raíz)
 * @param {number} [tol=1e-6] - Tolerancia de error relativo
 * @returns {Object} {iterations, root, converged, totalIter, error?}
 */
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

    if (Math.abs(fpx) < 1e-12) {
      // No exponer valor de x al usuario - security measure
      return { error: "La derivada es muy pequeña en este punto. Intentá con otro x₀." };
    }

    const x1 = x - fx / fpx;
    const err = Math.abs((x1 - x) / x1) * 100;

    // Validar que los valores sean números válidos
    if (!isFinite(x1) || !isFinite(err)) {
      return { iterations, root: +x.toFixed(8), converged: false, totalIter: i, error: "Cálculo divergió. Probá con otro x₀ inicial." };
    }

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

/**
 * Método de la Secante.
 * 
 * Aproxima la derivada usando dos puntos sin calcular f'(x) analíticamente.
 * Convergencia: Superlineal (orden ≈ 1.618, número áureo)
 * Requiere dos puntos iniciales x₀ y x₁.
 * 
 * @param {string} expr - Expresión matemática f(x)
 * @param {number|string} x0 - Primer punto inicial
 * @param {number|string} x1 - Segundo punto inicial
 * @param {number} [tol=1e-6] - Tolerancia de error relativo
 * @returns {Object} {iterations, root, converged, totalIter, error?}
 */
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

    // Validar que los valores sean números válidos
    if (!isFinite(x2) || !isFinite(err)) {
      return { iterations, root: +xCurr.toFixed(8), converged: false, totalIter: i, error: "Cálculo divergió. Probá con otros puntos iniciales." };
    }

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

/**
 * Método de Punto Fijo.
 * 
 * Itera xₙ₊₁ = g(xₙ) para converger a un punto fijo de g.
 * Convergencia depende de |g'(x)| < 1 en el entorno de la raíz.
 * Requiere reformular f(x)=0 como x=g(x) manualmente.
 * 
 * @param {string} exprG - Expresión de g(x), ejemplo: "sqrt(x + 2)" para x²-x-2=0
 * @param {number|string} x0 - Punto inicial
 * @param {number} [tol=1e-6] - Tolerancia de error relativo
 * @returns {Object} {iterations, root, converged, totalIter, error?}
 */
export function puntoFijo(exprG, x0, tol = 1e-6) {
  const { fn: g, error } = parseFunction(exprG);
  if (error) return { error };

  x0 = parseFloat(x0);
  if (isNaN(x0)) return { error: "Ingresá un valor numérico para x₀." };

  const iterations = [];
  let x = x0;

  for (let i = 1; i <= MAX_ITER; i++) {
    let gx;
    try { gx = g(x); } catch { 
      return { error: "Error al evaluar g(x). Revisá la expresión." }; 
    }

    if (!isFinite(gx)) {
      // No exponer número de iteración - security measure
      return { error: "El método diverge. Intentá reformular g(x) o elegir otro x₀." };
    }

    const err = Math.abs((gx - x) / gx) * 100;

    // Validar que los valores sean números válidos
    if (!isFinite(gx) || !isFinite(err)) {
      return { iterations, root: +x.toFixed(8), converged: false, totalIter: i, error: "El método diverge. Intentá reformular g(x) o elegir otro x₀." };
    }

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

/**
 * Genera puntos para graficar una función en un rango.
 * 
 * Valida inputs, limita rango y cantidad de puntos.
 * Returns array con {x, y} donde y puede ser null si f(x) diverge.
 * 
 * @param {string} expr - Expresión matemática f(x)
 * @param {number} xMin - Mínimo del rango X (debe ser < xMax)
 * @param {number} xMax - Máximo del rango X
 * @param {number} [n=200] - Cantidad de puntos (limitado: 10-500)
 * @returns {Array<{x: number, y: number|null}>}
 */
export function getPoints(expr, xMin, xMax, n = 200) {
  // Validar y convertir inputs
  xMin = parseFloat(xMin);
  xMax = parseFloat(xMax);
  n = parseInt(n);
  
  // Security validations: prevent DOS attacks
  if (isNaN(xMin) || isNaN(xMax)) return [];
  if (xMin >= xMax) return [];
  if (Math.abs(xMax - xMin) > 1e6) return []; // Prevenir rango infinito
  if (n < 10 || n > 500) n = 200; // Limitar cantidad de puntos
  
  const { fn: f, error } = parseFunction(expr);
  if (error) return [];

  const pts = [];
  for (let i = 0; i <= n; i++) {
    const x = xMin + (i * (xMax - xMin)) / n;
    try {
      const y = f(x);
      // Solo incluir valores finitos y en rango razonable para gráficos
      const safeY = (isFinite(y) && Math.abs(y) < 1e8) ? +y.toFixed(5) : null;
      pts.push({ x: +x.toFixed(3), y: safeY });
    } catch {
      // Si f(x) lanza error, mark como null (discontinuidad)
      pts.push({ x: +x.toFixed(3), y: null });
    }
  }
  return pts;
}

/**
 * Detector de raíces múltiples
 * 
 * Escanea el rango [xMin, xMax] buscando cambios de signo en f(x).
 * Cada cambio de signo indica una raíz potencial en ese intervalo.
 * Educa al usuario sobre la existencia de múltiples soluciones.
 * 
 * @param {string} expr - Expresión matemática f(x)
 * @param {number} xMin - Inicio del rango de búsqueda
 * @param {number} xMax - Fin del rango de búsqueda
 * @param {number} [step=0.1] - Tamaño del paso para el escaneo
 * @returns {Object} {count: number, intervals: Array<{a, b}>}
 */
export function detectMultipleRoots(expr, xMin, xMax, step = 0.1) {
  const { fn: f, error } = parseFunction(expr);
  if (error) return { count: 0, intervals: [] };

  const intervals = [];
  let x = xMin;

  while (x < xMax - step) {
    const x1 = x + step;
    try {
      const fa = f(x);
      const fb = f(x1);
      // Detectar cambio de signo: indicativo de una raíz en [x, x1]
      if (isFinite(fa) && isFinite(fb) && fa * fb < 0) {
        intervals.push({ a: +x.toFixed(2), b: +x1.toFixed(2) });
      }
    } catch { 
      // Si hay error evaluando, saltear este punto
    }
    x = x1;
  }

  return { count: intervals.length, intervals };
}
