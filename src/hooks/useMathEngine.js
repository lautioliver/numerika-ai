/**
 * useMathEngine — Custom hook para comunicarse con el Motor Matemático de NumérikaAI.
 *
 * Uso:
 *   const { derive, integrate, simplify, factorize, solve, validate, loading, error } = useMathEngine();
 *
 *   const result = await derive("x^3 - 2*x", "x");
 *   console.log(result.latex);  // "3 x^{2} - 2"
 */

import { useState, useCallback, useRef } from "react";

/** En prod sin VITE_MATH_ENGINE_URL no apunta a localhost (motor solo local). */
const DEFAULT_URL =
  import.meta.env.VITE_MATH_ENGINE_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "");

export function useMathEngine(baseUrl = DEFAULT_URL) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);

  // ── Fetch genérico ──────────────────────────────────────────────────────
  const request = useCallback(
    async (endpoint, body) => {
      // Cancelar request anterior si hay uno en curso
      if (controllerRef.current) {
        controllerRef.current.abort();
      }

      const controller = new AbortController();
      controllerRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${baseUrl}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data.detail || `Error del servidor (${res.status})`
          );
        }

        const data = await res.json();
        return data;
      } catch (err) {
        if (err.name === "AbortError") return null;

        const msg =
          err.message === "Failed to fetch"
            ? "No se pudo conectar con el motor matemático. ¿Está corriendo en " +
              baseUrl +
              "?"
            : err.message;

        setError(msg);
        throw new Error(msg);
      } finally {
        setLoading(false);
        controllerRef.current = null;
      }
    },
    [baseUrl]
  );

  // ── Operaciones ─────────────────────────────────────────────────────────

  const derive = useCallback(
    (expression, variable = "x") =>
      request("/api/math/derive", { expression, variable }),
    [request]
  );

  const integrate = useCallback(
    (expression, variable = "x", lower = null, upper = null) =>
      request("/api/math/integrate", { expression, variable, lower, upper }),
    [request]
  );

  const simplify = useCallback(
    (expression, variable = "x") =>
      request("/api/math/simplify", { expression, variable }),
    [request]
  );

  const factorize = useCallback(
    (expression, variable = "x") =>
      request("/api/math/factorize", { expression, variable }),
    [request]
  );

  const solve = useCallback(
    (equation, variable = "x") =>
      request("/api/math/solve", { equation, variable }),
    [request]
  );

  const validate = useCallback(
    (expression) =>
      request("/api/math/validate", { expression }),
    [request]
  );

  const odeSolve = useCallback(
    (equation, initialConditions = []) =>
      request("/api/math/ode/solve", {
        equation,
        initial_conditions: initialConditions,
      }),
    [request]
  );

  const odeSystem = useCallback(
    (equations, initialConditions = {}) =>
      request("/api/math/ode/system", {
        equations,
        initial_conditions: initialConditions,
      }),
    [request]
  );

  // ── Health check (GET) ──────────────────────────────────────────────────
  const checkHealth = useCallback(async () => {
    if (!baseUrl) return false;
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === "healthy";
    } catch {
      return false;
    }
  }, [baseUrl]);

  return {
    derive,
    integrate,
    simplify,
    factorize,
    solve,
    validate,
    odeSolve,
    odeSystem,
    checkHealth,
    loading,
    error,
    clearError: () => setError(null),
  };
}
