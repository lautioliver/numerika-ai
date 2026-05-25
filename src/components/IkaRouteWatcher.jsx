import { useEffect } from 'react';
import { useLocation, useParams, matchPath } from 'react-router-dom';
import { useIka } from '../context/IkaContext';

/**
 * Mapeo de patrones de ruta → contexto base que IKA debe ver.
 * Las páginas que necesiten contexto más detallado (Solver, Comparador, etc.)
 * siguen llamando a `updateContext()` localmente y sobreescriben este valor.
 */
const ROUTE_CONTEXTS = [
  {
    pattern: '/',
    page: 'Inicio',
    details: 'El usuario está en la portada de NumerikaAI explorando los métodos disponibles. Desde acá puede ir al Solver, al Comparador, a la Calculadora simbólica o a las Aplicaciones de ingeniería.',
  },
  {
    pattern: '/metodos',
    page: 'Catálogo de Métodos',
    details: 'El usuario está revisando el catálogo completo de métodos numéricos disponibles (Bisección, Regla Falsa, Newton-Raphson, Secante, Punto Fijo, sistemas lineales). Aún no eligió uno para usar.',
  },
  {
    pattern: '/solver',
    page: 'Solver',
    details: 'El usuario abrió el solver pero todavía no eligió un método específico.',
  },
  // /solver/:methodId lo maneja SolverPage con su propio updateContext()
  {
    pattern: '/comparar',
    page: 'Comparador',
    details: 'El usuario está en la página de comparación de métodos numéricos.',
  },
  {
    pattern: '/calculadora',
    page: 'Calculadora Simbólica',
    details: 'El usuario está en la calculadora simbólica. Acá puede derivar, integrar simbólicamente, simplificar, factorizar, resolver ecuaciones, resolver EDOs (orden superior, sistemas, Euler/RK4) o hacer integración numérica (Trapecio / Simpson).',
  },
  {
    pattern: '/aplicaciones',
    page: 'Aplicaciones de Ingeniería',
    details: 'El usuario está viendo el catálogo de aplicaciones prácticas (semáforos, análisis estructural, circuitos eléctricos, enfriamiento térmico).',
  },
  {
    pattern: '/aplicaciones/:appId',
    page: 'Aplicación',
    details: 'El usuario está usando una aplicación práctica de métodos numéricos.',
  },
  {
    pattern: '/login',
    page: 'Login',
    details: 'El usuario está en la pantalla de inicio de sesión.',
  },
  {
    pattern: '/register',
    page: 'Registro',
    details: 'El usuario está creando una cuenta nueva.',
  },
];

function matchRoute(pathname, params) {
  // Primero buscamos un match EXACTO (ej. /solver vs /solver/biseccion)
  const exact = ROUTE_CONTEXTS.find((r) => matchPath({ path: r.pattern, end: true }, pathname));
  if (exact) return exact;

  // Luego un match más laxo (con parámetros, end:false)
  return ROUTE_CONTEXTS.find((r) => matchPath({ path: r.pattern, end: false }, pathname));
}

/**
 * Vigila los cambios de ruta y actualiza el contexto de IKA automáticamente.
 * Páginas con contexto más rico (SolverPage, ComparisonPage, etc.) siguen
 * llamando a `updateContext()` y van a sobreescribir este valor.
 */
export function IkaRouteWatcher() {
  const location = useLocation();
  const params = useParams();
  const { updateContext } = useIka();

  useEffect(() => {
    const match = matchRoute(location.pathname, params);
    if (match) {
      let details = match.details;
      // Si hay params (ej. :appId, :methodId), los anexamos para dar más pistas
      if (params && Object.keys(params).length > 0) {
        const paramSummary = Object.entries(params)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ');
        details += ` Parámetros de ruta: ${paramSummary}.`;
      }
      updateContext(match.page, details);
    } else {
      updateContext('Página desconocida', `El usuario está en ${location.pathname}.`);
    }
  }, [location.pathname, params, updateContext]);

  return null;
}
