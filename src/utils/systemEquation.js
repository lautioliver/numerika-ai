/** Sistemas lineales — implementación en linearSystems.js */
export { resolverGauss, resolverJacobi } from "./linearSystems.js";
/** 2. INTERPOLACIÓN: POLINOMIO DE LAGRANGE. Genera puntos para graficar una curva suave que pasa por coordenadas exactas.
 */
export function interpolacionLagrange(puntosOriginales, cantidadPuntosGrafico = 100) {
    const n = puntosOriginales.length;

    const evaluarEnX = (x) => {
        let resultado = 0;
        for (let i = 0; i < n; i++) {
            let termino = puntosOriginales[i].y;
            for (let j = 0; j < n; j++) {
                if (j !== i) termino *= (x - puntosOriginales[j].x) / (puntosOriginales[i].x - puntosOriginales[j].x);
            }
            resultado += termino;
        }
        return resultado;
    };
    const xMin = Math.min(...puntosOriginales.map(p => p.x));
    const xMax = Math.max(...puntosOriginales.map(p => p.x));
    const paso = (xMax - xMin) / cantidadPuntosGrafico;

    let curvaGenerada = [];
    for (let x = xMin; x <= xMax; x += paso) {
        curvaGenerada.push({ x: Number(x.toFixed(2)), y: Number(evaluarEnX(x).toFixed(4)) });
    }
    return curvaGenerada; // Retorna array para Recharts
}