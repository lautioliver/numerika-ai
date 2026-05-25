/**
 * linearSystems.js — Sistemas de ecuaciones lineales Ax = b
 * Gauss, Gauss-Jordan, Cramer, Jacobi, Gauss-Seidel
 */

function cloneMatrix(M) {
  return M.map((row) => [...row]);
}

function formatNum(v, digits = 6) {
  if (!Number.isFinite(v)) return "—";
  const r = Number(v.toFixed(digits));
  return Object.is(r, -0) ? 0 : r;
}

function matrixCopy(A, b) {
  return A.map((row, i) => [...row, b[i]]);
}

function partialPivot(M, col) {
  const n = M.length;
  let maxRow = col;
  let maxVal = Math.abs(M[col][col]);
  for (let r = col + 1; r < n; r++) {
    const v = Math.abs(M[r][col]);
    if (v > maxVal) {
      maxVal = v;
      maxRow = r;
    }
  }
  if (maxVal < 1e-12) {
    return { ok: false, error: "Pivote nulo o sistema singular / indeterminado." };
  }
  if (maxRow !== col) {
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    return { ok: true, swapped: [col, maxRow] };
  }
  return { ok: true, swapped: null };
}

function backSubstitution(M, n) {
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) sum += M[i][j] * x[j];
    const piv = M[i][i];
    if (Math.abs(piv) < 1e-12) {
      return { error: "No hay solución única (pivote cero en sustitución)." };
    }
    x[i] = (M[i][n] - sum) / piv;
  }
  return { solution: x.map((v) => formatNum(v)) };
}

function determinant(mat) {
  const n = mat.length;
  const M = cloneMatrix(mat);
  let det = 1;
  let sign = 1;

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[maxRow][col])) maxRow = r;
    }
    if (Math.abs(M[maxRow][col]) < 1e-12) return 0;
    if (maxRow !== col) {
      [M[col], M[maxRow]] = [M[maxRow], M[col]];
      sign *= -1;
    }
    det *= M[col][col];
    for (let r = col + 1; r < n; r++) {
      const f = M[r][col] / M[col][col];
      for (let c = col; c < n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return det * sign;
}

function replaceColumn(A, colIndex, b) {
  return A.map((row, i) => row.map((val, j) => (j === colIndex ? b[i] : val)));
}

function isDiagonallyDominant(A) {
  const n = A.length;
  for (let i = 0; i < n; i++) {
    const diag = Math.abs(A[i][i]);
    let sum = 0;
    for (let j = 0; j < n; j++) {
      if (j !== i) sum += Math.abs(A[i][j]);
    }
    if (diag <= sum) return false;
  }
  return true;
}

function validateSystem(A, b) {
  const n = b.length;
  if (!A.length || A.length !== n) {
    return { ok: false, error: "La matriz A debe ser cuadrada y coincidir con el tamaño de b." };
  }
  for (let i = 0; i < n; i++) {
    if (A[i].length !== n) {
      return { ok: false, error: `Fila ${i + 1}: se esperaban ${n} columnas.` };
    }
    for (let j = 0; j < n; j++) {
      if (!Number.isFinite(A[i][j])) {
        return { ok: false, error: "Todos los coeficientes deben ser números válidos." };
      }
    }
    if (!Number.isFinite(b[i])) {
      return { ok: false, error: "Todos los términos independientes deben ser números válidos." };
    }
  }
  return { ok: true, n };
}

/** Eliminación de Gauss con pasos */
export function gaussElimination(A, b) {
  const check = validateSystem(A, b);
  if (!check.ok) return { success: false, error: check.error };

  const n = check.n;
  const M = matrixCopy(A, b);
  const steps = [{ label: "Matriz ampliada [A|b]", matrix: cloneMatrix(M) }];

  for (let col = 0; col < n; col++) {
    const piv = partialPivot(M, col);
    if (!piv.ok) return { success: false, error: piv.error };
    if (piv.swapped) {
      steps.push({
        label: `Pivoteo: intercambiar fila ${piv.swapped[0] + 1} ↔ ${piv.swapped[1] + 1}`,
        matrix: cloneMatrix(M),
      });
    }
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col];
      if (Math.abs(factor) < 1e-15) continue;
      for (let k = col; k <= n; k++) {
        M[row][k] -= factor * M[col][k];
      }
      steps.push({
        label: `F${row + 1} ← F${row + 1} − (${formatNum(factor)})·F${col + 1}`,
        matrix: cloneMatrix(M),
      });
    }
  }

  steps.push({ label: "Forma triangular superior", matrix: cloneMatrix(M) });

  const sub = backSubstitution(M, n);
  if (sub.error) return { success: false, error: sub.error };

  return {
    success: true,
    method: "gauss",
    solution: sub.solution,
    steps,
    triangular: cloneMatrix(M),
  };
}

/** Gauss-Jordan → forma escalonada reducida */
export function gaussJordan(A, b) {
  const check = validateSystem(A, b);
  if (!check.ok) return { success: false, error: check.error };

  const n = check.n;
  const M = matrixCopy(A, b);
  const steps = [{ label: "Matriz ampliada [A|b]", matrix: cloneMatrix(M) }];

  for (let col = 0; col < n; col++) {
    const piv = partialPivot(M, col);
    if (!piv.ok) return { success: false, error: piv.error };
    if (piv.swapped) {
      steps.push({
        label: `Pivoteo: fila ${piv.swapped[0] + 1} ↔ ${piv.swapped[1] + 1}`,
        matrix: cloneMatrix(M),
      });
    }
    const pivotVal = M[col][col];
    for (let k = 0; k <= n; k++) M[col][k] /= pivotVal;
    steps.push({
      label: `Normalizar fila pivote F${col + 1}`,
      matrix: cloneMatrix(M),
    });

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      if (Math.abs(factor) < 1e-15) continue;
      for (let k = 0; k <= n; k++) M[row][k] -= factor * M[col][k];
      steps.push({
        label: `F${row + 1} ← F${row + 1} − (${formatNum(factor)})·F${col + 1}`,
        matrix: cloneMatrix(M),
      });
    }
  }

  for (let i = 0; i < n; i++) {
    const rowZero = M[i].slice(0, n).every((v) => Math.abs(v) < 1e-10);
    if (rowZero && Math.abs(M[i][n]) > 1e-10) {
      return { success: false, error: "Sistema incompatible (fila 0 = c con c ≠ 0)." };
    }
  }

  const solution = M.map((row) => formatNum(row[n]));

  return {
    success: true,
    method: "gaussjordan",
    solution,
    steps,
    rref: cloneMatrix(M),
  };
}

/** Regla de Cramer (n = 2 o 3) */
export function cramerRule(A, b) {
  const check = validateSystem(A, b);
  if (!check.ok) return { success: false, error: check.error };
  const n = check.n;
  if (n > 3) {
    return { success: false, error: "Cramer solo está implementado para sistemas de hasta 3×3." };
  }

  const detA = determinant(A);
  if (Math.abs(detA) < 1e-12) {
    return { success: false, error: "det(A) = 0: no se puede aplicar Cramer (sistema singular)." };
  }

  const steps = [{ label: "det(A)", value: formatNum(detA) }];
  const solution = [];
  const cramerDetails = [];

  for (let i = 0; i < n; i++) {
    const Ai = replaceColumn(A, i, b);
    const detAi = determinant(Ai);
    const xi = detAi / detA;
    solution.push(formatNum(xi));
    cramerDetails.push({
      variable: `x${i + 1}`,
      detAi: formatNum(detAi),
      formula: `x${i + 1} = det(A${i + 1}) / det(A)`,
    });
    steps.push({
      label: `x${i + 1} = det(A${i + 1}) / det(A) = ${formatNum(detAi)} / ${formatNum(detA)}`,
      value: formatNum(xi),
    });
  }

  return {
    success: true,
    method: "cramer",
    solution,
    detA: formatNum(detA),
    cramerDetails,
    steps,
  };
}

function iterateJacobiOrSeidel(A, b, opts) {
  const { tolerancia, maxIter, x0, method } = opts;
  const check = validateSystem(A, b);
  if (!check.ok) return { success: false, error: check.error };

  const n = check.n;
  for (let i = 0; i < n; i++) {
    if (Math.abs(A[i][i]) < 1e-12) {
      return { success: false, error: `Elemento diagonal a${i + 1}${i + 1} = 0: el método no es aplicable.` };
    }
  }

  const warnings = [];
  if (!isDiagonallyDominant(A)) {
    warnings.push(
      "La matriz no es diagonalmente dominante; la convergencia no está garantizada."
    );
  }

  let x = x0?.length === n ? [...x0] : new Array(n).fill(0);
  const iterations = [];

  for (let k = 0; k < maxIter; k++) {
    const xNew = new Array(n);
    let errMax = 0;

    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const xj = method === "gaussseidel" && j < i ? xNew[j] : x[j];
        sum += A[i][j] * xj;
      }
      xNew[i] = (b[i] - sum) / A[i][i];
      errMax = Math.max(errMax, Math.abs(xNew[i] - x[i]));
    }

    iterations.push({
      iteracion: k + 1,
      valores: xNew.map((v) => formatNum(v)),
      error: formatNum(errMax),
    });

    x = xNew;
    if (errMax < tolerancia) {
      return {
        success: true,
        method,
        solution: x.map((v) => formatNum(v)),
        iterations,
        converged: true,
        totalIter: k + 1,
        warnings,
      };
    }
  }

  return {
    success: true,
    method,
    solution: x.map((v) => formatNum(v)),
    iterations,
    converged: false,
    totalIter: maxIter,
    warnings,
  };
}

export function jacobiMethod(A, b, tolerancia = 1e-4, maxIter = 100, x0 = null) {
  return iterateJacobiOrSeidel(A, b, {
    tolerancia,
    maxIter,
    x0,
    method: "jacobi",
  });
}

export function gaussSeidelMethod(A, b, tolerancia = 1e-4, maxIter = 100, x0 = null) {
  return iterateJacobiOrSeidel(A, b, {
    tolerancia,
    maxIter,
    x0,
    method: "gaussseidel",
  });
}

/** API unificada para la UI */
export function solveLinearSystem(methodId, A, b, options = {}) {
  const tol = options.tolerancia ?? 1e-4;
  const maxIter = options.maxIter ?? 100;
  const x0 = options.x0 ?? null;

  switch (methodId) {
    case "gauss":
      return gaussElimination(A, b);
    case "gaussjordan":
      return gaussJordan(A, b);
    case "cramer":
      return cramerRule(A, b);
    case "jacobi":
      return jacobiMethod(A, b, tol, maxIter, x0);
    case "gaussseidel":
      return gaussSeidelMethod(A, b, tol, maxIter, x0);
    default:
      return { success: false, error: "Método lineal no reconocido." };
  }
}

/** Compatibilidad: retorna solo el vector solución (AnalisisCircuitos) */
export function resolverGauss(matrizA, vectorB) {
  const res = gaussElimination(matrizA, vectorB);
  if (!res.success) throw new Error(res.error);
  return res.solution;
}

/** Compatibilidad: Jacobi legado */
export function resolverJacobi(matrizA, vectorB, tolerancia = 0.0001, maxIter = 100) {
  const res = jacobiMethod(matrizA, vectorB, tolerancia, maxIter);
  if (!res.success) throw new Error(res.error);
  return {
    solucion: res.solution,
    iteraciones: res.iterations.map((it) => ({
      iteracion: it.iteracion,
      valores: it.valores,
      error: parseFloat(it.error),
    })),
  };
}

export const LINEAR_SYSTEM_EXAMPLES = {
  2: {
    A: [
      [2, 1],
      [1, 3],
    ],
    b: [4, 5],
    label: "2×2 — solución x₁=1, x₂=2",
  },
  3: {
    A: [
      [3, 1, -1],
      [2, 4, 1],
      [1, 2, 5],
    ],
    b: [4, 11, 14],
    label: "3×3 — sistema bien condicionado",
  },
};

export const LINEAR_METHOD_IDS = ["gauss", "gaussjordan", "cramer", "jacobi", "gaussseidel"];

export function isLinearSolverMethod(methodId) {
  return LINEAR_METHOD_IDS.includes(methodId);
}
