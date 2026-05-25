/**
 * edoPlot3D.js — Helpers para generar datos 3D a partir de resultados EDO.
 *
 * Funciones:
 *  - generateSurfaceData: grilla z = f(t, y) para superficies Plotly
 *  - generateSolutionCurve3D: curva solución (t, y, z=f(t,y))
 *  - generateTrajectory3D: trayectoria paramétrica de sistema EDO
 *  - can3D: determina si un resultado admite visualización 3D
 */

import { parseOdeRhs } from "./numericalMethods";

// ─── Colorscale Numerika ────────────────────────────────────────────────────
export const NUMERIKA_COLORSCALE = [
  [0, "#E3DFBA"],    // cream
  [0.25, "#C8D6BF"], // sage
  [0.5, "#93CCC6"],  // teal-lt
  [0.75, "#6CBDB5"], // teal
  [1, "#1A1F1E"],    // dark
];

const AXIS_3D_STYLE = {
  showgrid: true,
  gridcolor: "rgba(122, 138, 130, 0.55)",
  gridwidth: 1.5,
  zerolinecolor: "#6CBDB5",
  zerolinewidth: 2.5,
  showline: true,
  linecolor: "#1A1F1E",
  linewidth: 2,
  showbackground: true,
  backgroundcolor: "rgba(232, 228, 210, 0.72)",
  title: { font: { size: 11, color: "#1A1F1E" } },
  tickfont: { size: 9, color: "#4a5652" },
  tickcolor: "#7a8a82",
};

export const NUMERIKA_3D_LAYOUT = {
  paper_bgcolor: "rgba(245, 243, 232, 1)",
  plot_bgcolor: "rgba(245, 243, 232, 1)",
  font: {
    family: "'DM Mono', monospace",
    color: "#7a8a82",
    size: 10,
  },
  hoverlabel: {
    bgcolor: "#faf9f2",
    bordercolor: "#6CBDB5",
    font: { family: "'DM Mono', monospace", size: 11, color: "#1A1F1E" },
  },
  scene: {
    xaxis: { ...AXIS_3D_STYLE },
    yaxis: { ...AXIS_3D_STYLE },
    zaxis: { ...AXIS_3D_STYLE },
    bgcolor: "rgb(232, 228, 210)",
  },
  margin: { l: 0, r: 0, t: 8, b: 0 },
  modebar: {
    bgcolor: "rgba(250, 249, 242, 0.9)",
    color: "#7a8a82",
    activecolor: "#6CBDB5",
  },
};

// ─── Generación de superficie z = f(t, y) ───────────────────────────────────
/**
 * Evalúa f(t, y) en una grilla tRange × yRange para generar datos de superficie.
 *
 * @param {string} rhsExpr — Expresión del lado derecho, ej: "t + y"
 * @param {[number, number]} tRange — [tMin, tMax]
 * @param {[number, number]} yRange — [yMin, yMax]
 * @param {number} steps — Resolución de la grilla (por eje)
 * @returns {{ tValues, yValues, zValues, error }}
 */
export function generateSurfaceData(rhsExpr, tRange, yRange, steps = 40) {
  const { fn, error } = parseOdeRhs(rhsExpr);
  if (error) return { error };

  const [tMin, tMax] = tRange;
  const [yMin, yMax] = yRange;
  const tStep = (tMax - tMin) / steps;
  const yStep = (yMax - yMin) / steps;

  const tValues = [];
  const yValues = [];
  const zValues = [];

  for (let j = 0; j <= steps; j++) {
    const y = yMin + j * yStep;
    yValues.push(+y.toFixed(4));
    const zRow = [];

    for (let i = 0; i <= steps; i++) {
      const t = tMin + i * tStep;
      if (j === 0) tValues.push(+t.toFixed(4));

      try {
        const z = fn(t, y);
        zRow.push(isFinite(z) ? +z.toFixed(6) : null);
      } catch {
        zRow.push(null);
      }
    }
    zValues.push(zRow);
  }

  return { tValues, yValues, zValues, error: null };
}

// ─── Curva solución 3D ──────────────────────────────────────────────────────
/**
 * Convierte puntos 2D de EdoNumerico + la función f(t,y) en una curva 3D.
 * Cada punto (t, y) se eleva a z = f(t, y).
 *
 * @param {Array<{t: number, y: number}>} points
 * @param {string} rhsExpr
 * @returns {{ t, y, z, error }}
 */
export function generateSolutionCurve3D(points, rhsExpr) {
  const { fn, error } = parseOdeRhs(rhsExpr);
  if (error) return { error };

  const t = [];
  const y = [];
  const z = [];

  for (const p of points) {
    const tVal = Number(p.t);
    const yVal = Number(p.y);
    t.push(tVal);
    y.push(yVal);

    try {
      const zVal = fn(tVal, yVal);
      z.push(isFinite(zVal) ? +zVal.toFixed(6) : null);
    } catch {
      z.push(null);
    }
  }

  return { t, y, z, error: null };
}

// ─── Trayectoria 3D de sistema EDO ──────────────────────────────────────────
/**
 * Extrae trayectoria paramétrica de un resultado de sistema EDO.
 * Para sistemas con 2 vars: (var1(t), var2(t), t)
 * Para sistemas con 3+ vars: el usuario elige cuáles 3 usar.
 *
 * @param {Object} result — Resultado del odeSystem
 * @param {string[]} chosenVars — Las 3 variables elegidas [x, y, z]
 * @param {number} tMin — t inicial
 * @param {number} tMax — t final
 * @param {number} steps — cantidad de puntos
 * @returns {{ x, y, z, labels, error }}
 */
export function generateTrajectory3D(result, chosenVars, tMin = 0, tMax = 10, steps = 200) {
  // The solutions from the backend are symbolic (e.g., "cos(t)", "sin(t)")
  // We need to evaluate them numerically
  if (!result?.solutions) {
    return { error: "No hay soluciones disponibles para graficar." };
  }

  const varNames = Object.keys(result.solutions);
  if (varNames.length < 2) {
    return { error: "Se necesitan al menos 2 variables para un gráfico 3D." };
  }

  // Pick the chosen variables (or defaults)
  const vars = chosenVars && chosenVars.length >= 2
    ? chosenVars
    : varNames.slice(0, Math.min(3, varNames.length));

  // For systems, we don't have numeric evaluation of the symbolic solutions
  // client-side easily. Instead, we return the variable names for the axes
  // and mark that evaluation needs server-side or is unavailable.
  return {
    variables: vars,
    axisLabels: vars,
    needsEvaluation: true,
    error: null,
  };
}

// ─── Trayectoria 3D desde puntos numéricos de EdoNumerico ───────────────────
/**
 * Genera trayectoria 3D a partir de múltiples ejecuciones numéricas.
 * Para sistemas resueltos numéricamente con múltiples variables.
 *
 * @param {Object} pointSets — { varName: [{t, value}...], ... }
 * @param {string[]} axes — [xVar, yVar, zVar] qué variable en cada eje
 * @returns {{ x[], y[], z[] }}
 */
export function buildTrajectoryFromPointSets(pointSets, axes) {
  const [xVar, yVar, zVar] = axes;

  const xData = pointSets[xVar] || [];
  const yData = pointSets[yVar] || [];
  const zData = pointSets[zVar] || [];

  const len = Math.min(xData.length, yData.length, zData.length);
  const x = [], y = [], z = [];

  for (let i = 0; i < len; i++) {
    x.push(Number(xData[i]?.value ?? xData[i]?.y ?? 0));
    y.push(Number(yData[i]?.value ?? yData[i]?.y ?? 0));
    z.push(Number(zData[i]?.value ?? zData[i]?.y ?? 0));
  }

  return { x, y, z };
}

// ─── Detector: ¿admite visualización 3D? ────────────────────────────────────
/**
 * Determina si un resultado EDO admite visualización 3D.
 *
 * @param {Object} result — Resultado del cálculo
 * @param {"numerico" | "sistema" | "orden_superior"} edoType
 * @returns {{ canShow: boolean, plotType: string, reason: string }}
 */
export function can3D(result, edoType) {
  if (!result) return { canShow: false, plotType: null, reason: "Sin resultado." };

  switch (edoType) {
    case "numerico":
      // Siempre se puede: la superficie z = f(t, y) es evaluable
      if (result.points?.length >= 2 && result.rhs) {
        return {
          canShow: true,
          plotType: "surface",
          reason: "Superficie z = f(t, y) con curva solución.",
        };
      }
      return { canShow: false, plotType: null, reason: "Datos insuficientes." };

    case "sistema":
      // Necesita ≥2 variables con soluciones
      if (result.solutions && Object.keys(result.solutions).length >= 2) {
        const nVars = Object.keys(result.solutions).length;
        return {
          canShow: true,
          plotType: nVars >= 3 ? "trajectory3d" : "trajectory2d_elevated",
          reason: nVars >= 3
            ? `Trayectoria 3D con ${nVars} variables.`
            : "Trayectoria 2D elevada con t como tercer eje.",
        };
      }
      return { canShow: false, plotType: null, reason: "Se necesitan ≥2 variables." };

    case "orden_superior":
      // No incluido en esta iteración
      return { canShow: false, plotType: null, reason: "No disponible para EDO de orden superior." };

    default:
      return { canShow: false, plotType: null, reason: "Tipo desconocido." };
  }
}
