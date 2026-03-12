# 🔧 PLAN DE REMEDIACIÓN DETALLADO - NumérikaAI
**Documento de Implementación Técnica**  
**Versión:** 1.0  
**Fecha Creación:** 12-03-2025

---

## TABLA DE CONTENIDOS
1. [FASE 1: Crítico (Semana 1-2)](#fase-1-crítico)
2. [FASE 2: Importante (Semana 2-3)](#fase-2-importante)
3. [FASE 3: Recomendado (Semana 3-4)](#fase-3-recomendado)
4. [Scripts de Testing](#scripts-de-testing)
5. [Checklist de Implementación](#checklist-de-implementación)

---

## FASE 1: CRÍTICO ⏰ Semana 1-2

### TAREA 1.1: Reemplazar `new Function()` con `mathjs`

**Prioridad:** 🔴 URGENTE  
**Tiempo:** 3-4 horas  
**Riesgo:** ALTO si no se implementa

#### Paso 1: Instalar dependencia
```bash
npm install mathjs
npm install --save-dev @types/mathjs  # Para TypeScript/editor
```

#### Paso 2: Crear nueva función segura

Reemplazar en `src/utils/numericalMethods.js`:

**original line 29-62:**
```javascript
// ❌ VIEJO (VULNERABLE)
export function parseFunction(expr) {
  if (!expr || expr.length > 200) {
    return { fn: null, error: "Función inválida. Revisá la sintaxis." };
  }

  const sanitized = expr
    .replace(/\^/g, "**")
    .replace(/(\d)(x)/g, "$1*$2")
    // ... más replaces

  try {
    const fn = new Function("x", `"use strict"; return (${sanitized});`);
    const testVal = fn(1);
    if (!Number.isFinite(testVal)) {
      throw new Error("Invalid return type");
    }
    return { fn, error: null };
  } catch (e) {
    return { fn: null, error: "Función inválida. Revisá la sintaxis." };
  }
}
```

**Reemplazar por:**

```javascript
import * as math from 'mathjs';

/**
 * Constantes de seguridad
 */
const MAX_EXPR_LENGTH = 200;
const FORBIDDEN_IDENTIFIERS = [
  'random', 'Math', 'Function', 'eval', 'fetch',
  'localStorage', 'sessionStorage', 'window', 'document',
  'constructor', 'prototype', '__proto__', 'console'
];

/**
 * Convierte de forma SEGURA una expresión matemática a función JS evaluable.
 * 
 * Usa mathjs.compile() que es:
 * - AST-based (no string injection)
 * - Auditado profesionalmente
 * - Evita new Function() inseguro
 * 
 * PERMITIDAS:
 * - Variables: x
 * - Números: 0-9, punto decimal
 * - Operadores: + - * / ^ ( ) 
 * - Funciones: sin, cos, tan, sqrt, log, exp, etc. (mathjs list)
 * 
 * NO PERMITIDAS:
 * - Funciones de sistema: fetch, eval, random
 * - Acceso a objetos: constructor, prototype
 * 
 * @param {string} expr - Expresión matemática (máx 200 chars)
 * @returns {{fn: Function|null, error: string|null}}
 * 
 * @example
 * const { fn } = parseFunction("x^2 + 3*x - 2");
 * if (fn) console.log(fn(2));  // 8
 */
export function parseFunction(expr) {
  // 1. Validar longitud
  if (!expr || expr.length > MAX_EXPR_LENGTH) {
    return { 
      fn: null, 
      error: "Expresión demasiado larga (máximo 200 caracteres)." 
    };
  }

  // 2. Validar que sea string
  if (typeof expr !== 'string') {
    return { 
      fn: null, 
      error: "Expresión inválida. Revisá la sintaxis." 
    };
  }

  // 3. Buscar identificadores prohibidos (case-insensitive)
  const exprLower = expr.toLowerCase();
  for (const forbidden of FORBIDDEN_IDENTIFIERS) {
    // Use word boundary para evitar false positives
    // "sin" no debería bloquearse si está dentro de "sing"
    if (new RegExp(`\\b${forbidden}\\b`, 'i').test(expr)) {
      return { 
        fn: null, 
        error: "Expresión inválida. Revisá la sintaxis." 
      };
    }
  }

  try {
    // 4. Compilar con mathjs (seguro, AST-based)
    const node = math.parse(expr);
    const compiled = node.compile();

    // 5. Test con valor de prueba
    const testVal = compiled.evaluate({ x: 1 });
    if (!Number.isFinite(testVal)) {
      throw new Error("Invalid return type");
    }

    // 6. Retornar función envuelta con protecciones
    return {
      fn: (x) => {
        // Validar input
        if (typeof x !== 'number' || !Number.isFinite(x)) {
          return null;
        }

        try {
          const result = compiled.evaluate({ x });
          // Retornar null si resultado no es número finito
          return Number.isFinite(result) ? result : null;
        } catch (e) {
          // Expresión causó error al evaluar (ej: log de número negativo)
          return null;
        }
      },
      error: null,
    };
  } catch (parseError) {
    // Error al parsear: sintaxis inválida
    return { 
      fn: null, 
      error: "Expresión inválida. Revisá la sintaxis." 
    };
  }
}
```

#### Paso 3: Testear la nueva función

```javascript
// Casos de prueba exitosos
console.assert(parseFunction("x^2 + 3*x - 2").fn?.(2) === 8, "Simple polynomial");
console.assert(parseFunction("sin(x) + cos(x)").fn?.(0) === 1, "Trigonometric");
console.assert(parseFunction("sqrt(x)").fn?.(4) === 2, "Square root");

// Casos de ataque (deberían fallar)
console.assert(parseFunction("Math.random()").error !== null, "Block Math");
console.assert(parseFunction("fetch('url')").error !== null, "Block fetch");
console.assert(parseFunction("constructor").error !== null, "Block constructor");
console.assert(parseFunction("eval('code')").error !== null, "Block eval");

// Edge cases
console.assert(parseFunction("1/0").fn?.(1) === null, "NaN handling");
console.assert(parseFunction("log(-1)").fn?.(1) === null, "Invalid math result");
console.assert(parseFunction("x".repeat(300)).error !== null, "Length limit");
```

---

### TAREA 1.2: Mejorar validación en `Field.jsx`

**Tiempo:** 1-2 horas

**Reemplazar:**
```javascript
// src/components/Field.jsx - línea 36-43

// ❌ VIEJO
const validateInput = useCallback((newValue) => {
  if (newValue.length > 200) return false;
  if (newValue.length === 0) return true;
  return /^[x\d\+\-\*\/\(\)\^\.\s\w]*$/.test(newValue);
}, []);
```

**Por:**
```javascript
/**
 * Constantes de validación
 */
const MATH_CHARS_PATTERN = /^[x\d+\-*/(). \t^√πe]*$/i;
const FORBIDDEN_PATTERNS = [
  /\bMath\b/i,
  /\bFunction\b/i,
  /\bconstructor\b/i,
  /\bprototype\b/i,
  /\breturn\b/i,
  /\beval\b/i,
  /\bfetch\b/i,
  /[{};[\]]/,  // Bloquear llaves, punto y coma, corchetes
];

/**
 * Validar input matemático en tiempo real.
 * 
 * Utiliza whitelist + blacklist para máxima seguridad.
 * Permite: x, números, operadores básicos, funciones trigonométricas
 * Bloquea: keywords del idioma, acceso a objetos, caracteres especiales
 */
const validateInput = useCallback((newValue) => {
  // 1. Límite de longitud
  if (newValue.length > 200) return false;

  // 2. Strings vacíos permitidos
  if (newValue.length === 0) return true;

  // 3. Whitelist de caracteres matemáticos
  if (!MATH_CHARS_PATTERN.test(newValue)) return false;

  // 4. Blacklist de patterns peligrosos
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(newValue)) return false;
  }

  // 5. Validar que no tenga más de 15 paréntesis (evita nesting profundo)
  const parenCount = (newValue.match(/[()]/g) || []).length;
  if (parenCount > 15) return false;

  return true;
}, []);
```

---

### TAREA 1.3: Mejorar Error Handling - Mensajes Genéricos

**Tiempo:** 1.5 horas

**Crear archivo:** `src/utils/errorMessages.js`

```javascript
/**
 * Mensajes de error estandarizados para seguridad
 * (evita exponer información interna)
 */
export const ERROR_MESSAGES = {
  // Validación de entrada
  INVALID_EXPRESSION: "Expresión inválida. Revisá la sintaxis.",
  INVALID_NUMBERS: "Parámetros numéricos inválidos.",
  INVALID_RANGE: "El intervalo especificado no es válido.",
  EMPTY_FUNCTION: "Ingresá una función para continuar.",

  // Cálculo
  METHOD_FAILED: "El método no convergió. Intentá con otros parámetros.",
  DIVERGENCE: "El método diverge. Reformulá la expresión o cambiá los valores iniciales.",
  UNSTABLE: "El método es inestable con estos parámetros.",

  // System/General
  INTERNAL_ERROR: "Surgió un error inesperado. Intentá de nuevo.",
  TIMEOUT: "El cálculo tardó demasiado. Simplificá la expresión.",
};

/**
 * Sanitizar mensajes de error antes de mostrar al usuario
 * @param {string} rawError - Error del sistema
 * @returns {string} Mensaje seguro para usuario
 */
export function sanitizeErrorMessage(rawError) {
  // Mapear errores internos a mensajes seguros
  if (rawError?.includes("Division by zero")) {
    return ERROR_MESSAGES.DIVERGENCE;
  }
  if (rawError?.includes("Maximum call stack")) {
    return ERROR_MESSAGES.DIVERGENCE;
  }
  if (rawError?.includes("NaN")) {
    return ERROR_MESSAGES.METHOD_FAILED;
  }

  // Default: mensaje genérico
  return ERROR_MESSAGES.INTERNAL_ERROR;
}
```

**Usarlo en `numericalMethods.js`:**

```javascript
// Importar al inicio del archivo
import { ERROR_MESSAGES, sanitizeErrorMessage } from './errorMessages';

// Reemplazar mensajes específicos por genéricos
export function secante(expr, x0, x1, tol = 1e-6) {
  const { fn: f, error } = parseFunction(expr);
  if (error) return { error: ERROR_MESSAGES.INVALID_EXPRESSION };

  x0 = parseFloat(x0); x1 = parseFloat(x1);
  if (isNaN(x0) || isNaN(x1)) 
    return { error: ERROR_MESSAGES.INVALID_NUMBERS };

  const iterations = [];
  let xPrev = x0, xCurr = x1;

  for (let i = 1; i <= MAX_ITER; i++) {
    const f0 = f(xPrev), f1 = f(xCurr);
    
    if (Math.abs(f1 - f0) < 1e-12) {
      // ✓ SEGURO: Mensaje genérico
      return { error: ERROR_MESSAGES.METHOD_FAILED };
    }

    const x2 = xCurr - f1 * (xCurr - xPrev) / (f1 - f0);
    // ... resto igual
  }

  return { iterations, root: +xCurr.toFixed(8), converged: false, totalIter: MAX_ITER };
}
```

---

### TAREA 1.4: Escapar HTML en Tablas de Resultados

**Tiempo:** 1 hora

**En `src/pages/SolverPage.jsx` - cerca de línea 336:**

```javascript
// ✅ NUEVO: Función helper para escape
const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(text).replace(/[&<>"']/g, c => map[c]);
};

// Luego en el JSX:
{result && (
  <>
    {/* ... otro código ... */}
    
    {/* Table — MEJORADO */}
    <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${C.border}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ background: C.bg }}>
            {method.cols.map((col) => (
              <th key={col} style={{ ... }}>
                {method.labels[col]}  {/* Ya es seguro: es string literal */}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.iterations.map((row, i) => (
            <tr key={i} style={{ background: row.converged ? "rgba(108,189,181,0.07)" : "transparent" }}>
              {method.cols.map((col) => (
                <td key={col} style={{ ... }}>
                  {/* ✅ ESCAPE: Prevenir XSS */}
                  {row[col] === null || row[col] === undefined 
                    ? "—" 
                    : col === "err" && row[col] !== null 
                      ? `${escapeHtml(row[col])}%`
                      : escapeHtml(row[col])
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    
    {/* ... resto ... */}
  </>
)}
```

---

## FASE 2: IMPORTANTE ⏰ Semana 2-3

### TAREA 2.1: Validar inputs numéricos (a, b, x0)

**Tiempo:** 1.5 horas

**En `src/pages/SolverPage.jsx`:**

```javascript
// ✅ NUEVO: Component helper para inputs numéricos seguros
const NumericInput = ({ value, onChange, label, placeholder, min = -1e6, max = 1e6 }) => {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontSize: 9,
          letterSpacing: "2px",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          
          // Permitir string vacío para que usuario pueda borrar
          if (val === "") {
            onChange("");
            return;
          }

          // Parsear y validar
          const num = parseFloat(val);
          if (!isNaN(num) && isFinite(num) && num >= min && num <= max) {
            onChange(val);
          }
          // Si no es válido, ignora el input silenciosamente
        }}
        placeholder={placeholder}
        min={min}
        max={max}
        step="0.0001"
        style={{
          width: "100%",
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "9px 12px",
          fontFamily: "'DM Mono',monospace",
          fontSize: 13,
          color: C.dark,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
};

// Luego usar así:
{method.inputs.includes("ab") && (
  <div style={{ marginBottom: 16 }}>
    <label style={{ ... }}>Intervalo [a, b]</label>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <NumericInput 
        label="a" 
        value={vals.a} 
        onChange={(v) => set("a", v)} 
        placeholder="1"
        min={-1000000}
        max={1000000}
      />
      <NumericInput 
        label="b" 
        value={vals.b} 
        onChange={(v) => set("b", v)} 
        placeholder="3"
        min={-1000000}
        max={1000000}
      />
    </div>
  </div>
)}
```

---

### TAREA 2.2: Memoizar SolverPage

**Tiempo:** 30 minutos

**En `src/pages/SolverPage.jsx` - línea 1:**

```javascript
import { useState, useMemo, useEffect, memo, useCallback } from "react";

// ... exports anteriores ...

// ✅ NUEVO: Envolver componente con memo
export const SolverPage = memo(function SolverPageComponent({ 
  activeMethod, 
  setActiveMethod, 
  calculated, 
  onCalculate 
}) {
  // ... todo el código del componente igual ...
  
  // Pero agregar useCallback al handler:
  const set = useCallback((k, v) => setVals(p => ({ ...p, [k]: v })), []);
  const run = useCallback(() => {
    setCalcErr(null);
    setResult(null);
    const r = method.run(vals);
    if (r.error) {
      setCalcErr(r.error);
      return;
    }
    setResult(r);
    if (onCalculate) onCalculate();
  }, [vals, method, onCalculate]);

  // ... resto del componente igual ...
});

// Comparador de props para custom memo
SolverPage.displayName = 'SolverPage';
```

---

### TAREA 2.3: Agregar eslint-plugin-security

**Tiempo:** 45 minutos

```bash
npm install --save-dev eslint-plugin-security
```

**Actualizar `.eslintrc.cjs` (o crear si no existe):**

```javascript
export default [
  // ... config existente ...
  {
    plugin: "security",
    rules: {
      // Detecta uso de new Function
      "security/detect-new-Function": "error",
      // Detecta innerHTML sin sanitizar
      "security/detect-unsafe-regex": "warn",
      // Detecta eval
      "security/detect-eval-with-expression": "error",
      // Detecta setTimeout/setInterval con strings
      "security/detect-non-literal-regexp": "warn",
      // Detecta require dinámicos
      "security/detect-non-literal-require": "warn",
    }
  }
];
```

**Ejecutar:**
```bash
npm run lint
```

---

### TAREA 2.4: Corregir acceso a `window` (SSR)

**Tiempo:** 30 minutos

**En `src/pages/SolverPage.jsx` - línea 29:**

```javascript
// ❌ VIEJO (falla en SSR)
const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

// ✅ NUEVO (compatible SSR)
const [isMobile, setIsMobile] = useState(() => 
  typeof window !== 'undefined' ? window.innerWidth <= 768 : false
);

useEffect(() => {
  // Guard para SSR
  if (typeof window === 'undefined') return;

  // Debounce para evitar many updates
  let timeoutId;
  const handleResize = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      setIsMobile(window.innerWidth <= 768);
    }, 150);
  };

  window.addEventListener("resize", handleResize);
  
  // Cleanup
  return () => {
    window.removeEventListener("resize", handleResize);
    clearTimeout(timeoutId);
  };
}, []);
```

---

## FASE 3: RECOMENDADO ⏰ Semana 3-4

### TAREA 3.1: Completar JSDoc

**Tiempo:** 2-3 horas

**Template estándar:**

```javascript
/**
 * Descripción corta en una línea
 * 
 * Descripción larga si aplica (comportamiento, limitaciones, casos especiales)
 * 
 * @param {type} paramName - Descripción del parámetro
 * @param {type} [optional=default] - Parámetro opcional con default
 * @returns {type} Descripción de lo que retorna
 * @throws {Error} Descripción de cuándo y por qué lanza error
 * 
 * @example
 * // Ejemplo de uso típico
 * const result = myFunction(param1, param2);
 * console.log(result);  // Output esperado
 * 
 * @see relatedFunction
 */
```

**Ejemplo en `CustomTooltip` (Solver.jsx):**

```javascript
/**
 * CustomTooltip — Tooltip personalizado para gráficos Recharts
 * 
 * Muestra valores de X e Y cuando el usuario hover sobre puntos en el gráfico.
 * Diseñado para complementar InteractiveChart.
 * 
 * @param {Object} props - Props del componente
 * @param {boolean} props.active - Si el tooltip está activo (hover detectado)
 * @param {Array<Object>} props.payload - Datos del punto hover
 * @param {Object} props.payload[0].payload - Objeto con { x, y, ... }
 * @returns {JSX.Element|null} Tooltip renderizado o null si no activo
 * 
 * @example
 * <Tooltip content={<CustomTooltip />} />
 * 
 * @see https://recharts.org/api/Tooltip
 */
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { x, y } = payload[0].payload;
  return (
    <div style={{ background: C.surface, borderRadius: 6, padding: "6px 12px" }}>
      <span>x = {x}</span>
      <span>f(x) = {y}</span>
    </div>
  );
};
```

---

### TAREA 3.2: Documentar constantes mágicas

**Tiempo:** 1 hora

**Crear `src/constants/config.js`:**

```javascript
/**
 * CONFIGURACIÓN Y CONSTANTES - Numerika AI
 * 
 * Este archivo centraliza todas las constantes "mágicas" del proyecto.
 * Cada constante incluye explicación de su valor y trade-offs.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTES NUMÉRICAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Máximo número de iteraciones permitidas en métodos numéricos
 * 
 * ¿POR QUÉ 100?
 * - Demasiado bajo (< 50): métodos pueden no converger lo suficiente
 * - Muy alto (> 200): tiempo de cómputo visual lag en navegador
 * - 100: balance empírico para usuarios en 2G/3G
 * 
 * TRADE-OFF: Precisión vs. Velocidad
 * - Mayor: mejor convergencia, pero más lento
 * - Menor: más rápido, pero menos precisión
 * 
 * ⚠️ SEGURIDAD: Limitador de DoS (previene loops infinitos)
 * 
 * @type {number}
 */
export const MAX_ITERATIONS = 100;

/**
 * Epsilon de máquina - menor número ≠ 0 en punto flotante
 * 
 * Usado para:
 * - Comparar números cercanos a cero
 * - Detectar divergencia (cuando derivada es muy pequeña)
 * - Evitar división por cero
 * 
 * Valor: 1e-12
 * - JavaScript IEEE 754 double precision
 * - Compromiso: evita error de redondeo VS detectar ceros reales
 * 
 * @type {number}
 */
export const EPSILON = 1e-12;

/**
 * Paso de diferenciación para cálculo de derivadas numéricas (h en f'(x) ≈ [f(x+h)-f(x-h)]/2h)
 * 
 * FÓRMULA DE DIFERENCIA CENTRAL:
 * f'(x) ≈ [f(x + h) - f(x - h)] / (2h)
 * 
 * ¿POR QUÉ 1e-7?
 * - Demasiado grande (1e-5): aproximación pobre (error de truncamiento alto)
 * - Demasiado pequeño (1e-10): cancelación de cifras significativas
 * - 1e-7: minimiza SUMA de ambos errores
 * 
 * REFERENCIA: Numerical Recipes, Press et al., Table 5.7.1
 * 
 * @type {number}
 */
export const DERIVATIVE_STEP = 1e-7;

/**
 * Límite máximo de valor Y para incluir en gráficos
 * 
 * Valores >= 1e8 se consideran:
 * - Discontinuidades (asíntotas verticales)
 * - Errores de evaluación
 * - Overflow potencial
 * 
 * Ejemplos:
 * ✓ tan(π/2) → ±∞ → descartado
 * ✓ log(0) → -∞ → descartado
 * ✓ 1/(x-1) en x→1 → ±Infinity → descartado
 * 
 * @type {number}
 */
export const GRAPH_Y_CLAMP_LIMIT = 1e8;

/**
 * Cantidad de puntos generados para graficar funciones
 * 
 * ¿POR QUÉ 200?
 * - Bajo (50): gráfico "pixelado", pobre visualización
 * - Alto (500+): lag en navegador, muchas llamadas a f()
 * - 200: resolución visual buena + performance aceptable
 * 
 * Rango permitido: [10, 500]
 * - Si usuario especifica < 10: usar 10
 * - Si usuario especifica > 500: usar 500
 * 
 * @type {number}
 */
export const GRAPH_POINTS_COUNT = 200;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTES DE ENTRADA / VALIDACIÓN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Longitud máxima de expresión matemática (caracteres)
 * 
 * RAZONES:
 * - DoS: Expresiones muy largas causan cálculos costosos
 * - UX: Campo input razonable en mobile
 * - Memoria: Compilar expresiones largas es costoso
 * 
 * @type {number}
 */
export const MAX_EXPRESSION_LENGTH = 200;

/**
 * Rango permitido para valores numéricos de entrada (a, b, x0, etc)
 * 
 * ¿POR QUÉ [-1e6, 1e6]?
 * - Límite superior: evita overflow y cálculos infinitos
 * - Límite inferior: números muy negativos pueden causar issues
 * - 1e6: "suficientemente grande" para ingeniería, pequeño para DoS
 * 
 * @type {Object}
 */
export const NUMERIC_INPUT_LIMITS = {
  MIN: -1e6,
  MAX: 1e6,
};

/**
 * Identificadores/funciones prohibidas en expresiones matemáticas
 * 
 * RAZÓN: Seguridad (prevenir code injection)
 * Aunque sin mathjs, sigue siendo una capa de defensa adicional.
 * 
 * @type {Array<string>}
 */
export const FORBIDDEN_IDENTIFIERS = [
  'random', // Función aleatoria
  'Math',   // Acceso a objeto Math
  'Function', // Constructor de función
  'eval',   // Evaluación de código
  'fetch',  // HTTP request
  'localStorage', // Acceso a storage
  'sessionStorage',
  'window', // Acceso a objeto global
  'document', // Acceso a DOM
  'constructor', // Prototype pollution
  'prototype',
  '__proto__',
  'console', // Logging
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTES UI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Breakpoint para detectar mobile (pixels)
 * 
 * Usado en: responsive layout, SolverPage grid
 * 
 * @type {number}
 */
export const MOBILE_BREAKPOINT = 768;

/**
 * Delay para debounce de eventos (ms)
 * 
 * Usado en: resize listener
 * 
 * ¿POR QUÉ 150ms?
 * - Humano no nota delay < 100ms
 * - Reduce re-renders significativamente
 * - 150ms: balance perceptibilidad vs. responsiveness
 * 
 * @type {number}
 */
export const DEBOUNCE_DELAY = 150;
```

**Luego usar así:**

```javascript
// En numericalMethods.js
import { MAX_ITERATIONS, EPSILON, DERIVATIVE_STEP } from '../constants/config';

const MAX_ITER = MAX_ITERATIONS;

function derivative(f, x, h = DERIVATIVE_STEP) {
  return (f(x + h) - f(x - h)) / (2 * h);
}

// En SolverPage.jsx
import { MOBILE_BREAKPOINT, DEBOUNCE_DELAY } from '../constants/config';

const [isMobile, setIsMobile] = useState(() =>
  typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
);

const handleResize = () => {
  // ... debounce con DEBOUNCE_DELAY ...
};
```

---

### TAREA 3.3: Crear documentación arquitectónica

**Tiempo:** 2 horas

**Crear `docs/ARCHITECTURE.md`:**

```markdown
# Arquitectura de NumérikaAI

## Overview
NumérikaAI es una herramienta educativa para resolver ecuaciones usando 5 métodos numéricos distintos.

## Stack Tecnológico
- Frontend: React 19 + Vite
- Gráficos: SVG puro (custom) + Recharts
- Matemática: mathjs (expresiones seguras)
- Estilos: CSS vanilla (design system local)

## Directorios

### `/src/utils`
Lógica matemática core. **CRÍTICO: punto de validación de entrada**

#### `numericalMethods.js`
- **Función clave:** `parseFunction(expr)` 
  - Convierte string → JavaScript function de forma SEGURA
  - Usa mathjs.compile() (AST-based, no new Function)
- **5 Métodos:**
  1. Bisección - Método de intervalo cerrado
  2. Regla Falsa - Interpolación lineal
  3. Newton-Raphson - Usa derivada numérica
  4. Secante - Aproxima derivada con 2 puntos
  5. Punto Fijo - Iteración dirección x = g(x)

#### `errorMessages.js`
- Mensajes de error estandarizados
- Previene information disclosure

### `/src/components`
Componentes React reutilizables

#### Componentes principales
- `Field.jsx` - Input validado para expresiones
- `InteractiveChart.jsx` - Gráfico SVG interactivo (memoizado)
- `GuideAccordion.jsx` - Instrucciones dinámicas por método
- `Navigation.jsx` - Barra superior
- `Card.jsx` - Tarjeta de información reutilizable

**Nota:** `Solver.jsx` es antiguo, usar `SolverPage.jsx`

### `/src/pages`
Páginas de la aplicación

#### `SolverPage.jsx` (PRINCIPAL)
- Interfaz principal: 2 paneles (config + resultados)
- Maneja estado: valores de entrada, resultado, errores
- Renderiza: Field inputs, InteractiveChart, tabla iteraciones, GuideAccordion

#### `HomePage.jsx`, `MethodsPage.jsx`
- Páginas informativas
- Navegan a SolverPage con método preseleccionado

## Flujo de Datos

\`\`\`
Usuario escribe f(x) en Field.jsx
         ↓
SolverPage valida + prepara valores
         ↓
Usuario hace click "Calcular"
         ↓
SolverPage llama método numérico (ej: biseccion)
         ↓
Método llama parseFunction(expr) [SEGURIDAD CRÍTICA]
         ↓
parseFunction() usa mathjs.compile()
         ↓
Devuelve función segura: fn(x) → number
         ↓
Método itera: xₙ₊₁ = f(xₙ) (Newton, etc)
         ↓
Retorna: {iterations, root, converged}
         ↓
SolverPage renderiza:
   - InteractiveChart(points, root, fnLabel)
   - Tabla con iteraciones
   - GuideAccordion(methodId, values)
\`\`\`

## Seguridad: Capas de Defensa

### Capa 1: Validación de Input (Field.jsx)
- Whitelist de caracteres matemáticos
- Blacklist de keywords peligrosas
- Límite de longitud 200 chars
- Límite de paréntesis 15 máximo

### Capa 2: Parsing Seguro (numericalMethods.js)
- ✓ Usa mathjs.compile() (AST-based)
- ✗ NO usa new Function()
- Búsqueda de forbidden identifiers (fetch, eval, etc)
- Try-catch para errores de parsing

### Capa 3: Limitadores (numericalMethods.js)
- MAX_ITERATIONS = 100 (evita loops infinitos/DoS)
- Graph Y clamp 1e8 (evita overflow visual)
- Cálculo de puntos limitado 10-500

### Capa 4: Sanitización de Output
- escapeHtml() en tablas
- XSS prevention
- Mensajes de error genéricos (sin info interna)

## Performance Optimizations

- `InteractiveChart` memoizado con React.memo()
- `useMemo` para: cálculo de puntos, escalas, paths SVG
- `useCallback` para: handlers, validación
- Debounce en resize listener
- `SolverPage` memoizado (props comparison)

## Constantes Configurables

Ver `src/constants/config.js` para:
- MAX_ITERATIONS: max loops en métodos
- EPSILON: tolerancia numérica
- DERIVATIVE_STEP: h en f'(x) ≈ [f(x+h)-f(x-h)]/2h
- MOBILE_BREAKPOINT: responsive layout
- (más...)

Cada constante incluye justificación de su valor.

## Roadmap / TODO

- [ ] Explicaciones con IA (placeholder en SolverPage)
- [ ] Guardado de cálculos (localStorage o server)
- [ ] Tests unitarios de security
- [ ] Pentesting profesional
- [ ] i18n (soporte multiidioma)
- [ ] Modos de complejidad (principiante/avanzado)
```

---

### TAREA 3.4: Crear docs/SECURITY.md

**Tiempo:** 1 hora

```markdown
# Security Policy - NumérikaAI

## Known Vulnerabilities & Fixes

See AUDIT_REPORT.md for detailed vulnerability analysis.

### CRITICAL

1. **Code Injection via new Function()**
   - Status: FIXED (use mathjs)
   - Details: AUDIT_REPORT.md #1

2. **Weak Input Validation**
   - Status: FIXED (improved regex + blacklist)
   - Details: AUDIT_REPORT.md #2

3. **Information Disclosure**
   - Status: FIXED (generic error messages)
   - Details: AUDIT_REPORT.md #3

## Security Best Practices

### Running Security Checks

\`\`\`bash
# Dependency audit
npm audit

# ESLint with security plugins
npm run lint

# Check for vulnerable patterns
npm run security-check  # (add this script)
\`\`\`

### package.json scripts to add:

\`\`\`json
{
  "scripts": {
    "security-check": "eslint . --ext .js --plugin security",
    "audit-fix": "npm audit fix",
    "verify-build": "npm run lint && npm run build"
  }
}
\`\`\`

### Contributing

Cuando reportes un issue:
1. NO lo reportes públicamente si es security
2. Contacta: [security email - TODO]
3. Incluye: reproducción steps, impacto, versión

## Dependency Management

- Keep `package.json` dependencies updated
- Review CVEs in dependencies quarterly
- Use `npm outdated` to check for updates
- Pin major versions but allow patch updates (^18.0.0)

## Code Review Checklist

- [ ] Usa mathjs (no new Function)
- [ ] Inputs validados (Field.jsx whitelist)
- [ ] HTML escapado en outputs
- [ ] Errores genéricos (sin info interna)
- [ ] No acceso directo a `window` (SSR safe)
- [ ] Límites computacionales (MAX_ITER, etc)
```

---

## SCRIPTS DE TESTING

### Test parseFunction() Security

**Archivo:** `src/utils/__tests__/parseFunction.security.test.js`

```javascript
import { parseFunction } from '../numericalMethods';

describe('parseFunction Security Tests', () => {
  describe('Valid expressions', () => {
    test('accepts simple polynomial', () => {
      const { fn, error } = parseFunction("x^2 + 3*x - 2");
      expect(error).toBeNull();
      expect(fn(2)).toBe(8);
    });

    test('accepts trig functions', () => {
      const { fn } = parseFunction("sin(x) + cos(x)");
      expect(fn(0)).toBeCloseTo(1);
    });

    test('accepts empty string', () => {
      const { fn, error } = parseFunction("");
      expect(error).not.toBeNull(); // Empty expresión no es válida
    });
  });

  describe('Security: Code Injection', () => {
    const ATTACKS = [
      "Math.random()",
      "fetch('http://evil.com')",
      "localStorage.getItem('csrf')",
      "window.location.href = 'http://phishing.com'",
      "eval('alert(1)')",
      "constructor.prototype",
      "Function('code')()",
      "console.log('hacked')",
    ];

    ATTACKS.forEach(attack => {
      test(`blocks attack: ${attack}`, () => {
        const { error } = parseFunction(attack);
        expect(error).not.toBeNull();
        expect(error).toContain("inválida");
      });
    });
  });

  describe('Security: Resource Exhaustion (DoS)', () => {
    test('rejects expression > 200 chars', () => {
      const longExpr = "x" + "+1".repeat(100);
      const { error } = parseFunction(longExpr);
      expect(error).not.toBeNull();
    });

    test('handles NaN gracefully', () => {
      const { fn } = parseFunction("log(-1)"); // Invalid math
      expect(fn(1)).toBeNull(); // Not NaN, but null
    });

    test('handles Infinity gracefully', () => {
      const { fn } = parseFunction("1/0");
      expect(fn(0)).toBeNull();
    });
  });
});
```

**Ejecutar:**
```bash
npm test parseFunction.security.test.js
```

---

## CHECKLIST DE IMPLEMENTACIÓN

### FASE 1: CRÍTICO
- [ ] **1.1** Reemplazar new Function() con mathjs
  - [ ] Install mathjs
  - [ ] Crear nueva parseFunction()
  - [ ] Test casos exitosos
  - [ ] Test casos de ataque
  - [ ] Verificar que todos los métodos llaman al nuevo parseFunction()

- [ ] **1.2** Mejorar validación Field.jsx
  - [ ] Actualizar regex MATH_CHARS_PATTERN
  - [ ] Agregar FORBIDDEN_PATTERNS
  - [ ] Test con casos de entrada válida
  - [ ] Test con casos de ataque

- [ ] **1.3** Error handling genérico
  - [ ] Crear errorMessages.js
  - [ ] Reemplazar mensajes específicos por genéricos
  - [ ] Test que mensajes no exponen info

- [ ] **1.4** Sanitizar HTML en tablas
  - [ ] Crear escapeHtml() function
  - [ ] Reemplazar renderizado de tablas
  - [ ] Test XSS prevention

### FASE 2: IMPORTANTE
- [ ] **2.1** Validar inputs numéricos
  - [ ] Crear NumericInput component
  - [ ] Reemplazar inputs [a, b, x0, x1]
  - [ ] Test rango min/max
  - [ ] Test que NaN/Infinity rechazados

- [ ] **2.2** Memoizar SolverPage
  - [ ] Envolver con React.memo()
  - [ ] Agregar useCallback al set()
  - [ ] Verificar props comparison
  - [ ] Medir performance

- [ ] **2.3** ESLint security plugin
  - [ ] Install eslint-plugin-security
  - [ ] Configurar .eslintrc
  - [ ] Run npm run lint
  - [ ] Fix violations

- [ ] **2.4** Window access guard
  - [ ] Agregar typeof window guard en useState init
  - [ ] Agregar guard en useEffect
  - [ ] Agregar debounce a resize
  - [ ] Test SSR compatibility (si aplica)

### FASE 3: RECOMENDADO
- [ ] **3.1** JSDoc documentación
  - [ ] CustomTooltip en Solver.jsx
  - [ ] GUIDES objeto en GuideAccordion.jsx
  - [ ] derivative() function
  - [ ] Otros componentes (15+ archivos)

- [ ] **3.2** Documentar constantes
  - [ ] Crear constants/config.js
  - [ ] Mover todas las constantes mágicas
  - [ ] Documentar POR QUÉ cada valor
  - [ ] Actualizar imports

- [ ] **3.3** docs/ARCHITECTURE.md
  - [ ] Crear estructura del proyecto
  - [ ] Documentar flujo de datos
  - [ ] Explicar capas de seguridad
  - [ ] Performance optimizations

- [ ] **3.4** docs/SECURITY.md
  - [ ] Listar vulnerabilidades conocidas
  - [ ] Scripts de seguridad
  - [ ] Guía de contribución
  - [ ] Policy de reporte

### FASE 4: VERIFICACIÓN
- [ ] Todos los tests pasan
- [ ] npm audit está limpio
- [ ] npm run lint sin errores
- [ ] Lighthouse score >= 90
- [ ] Pentesting en roadmap
- [ ] AUDIT_REPORT.md actualizado con fixes

---

## ESTIMACIÓN TOTAL

| Fase | Tareas | Horas | Personas-Semana |
|------|--------|-------|-----------------|
| 1 (Crítico) | 4 | 7-8 | 1 |
| 2 (Importante) | 4 | 4 | 0.5 |
| 3 (Recomendado) | 4 | 6 | 0.75 |
| 4 (Verificación) | 1 | 2 | 0.25 |
| **TOTAL** | **13** | **19-21 horas** | **2.5** |

---

**Próximos Pasos:**
1. Priorizar FASE 1 (crítico)
2. Crear ramas de feature por tarea
3. Hacer PRs con tests
4. Code review con seguridad como criterio
5. Mergear cuando todos los tests pasen

