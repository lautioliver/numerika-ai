# NumérikaAI — Roadmap de Features 🚀

> Documento orientado a agentes de IA y desarrolladores.  
> Cada feature describe **qué** hay que construir, **dónde** vive en el código y **cómo** se conecta con el resto del sistema.

---

## Índice

1. [Mejorar Visualización del Gráfico en Mobile](#1-mejorar-visualización-del-gráfico-en-mobile)
2. [Implementación de Nuevos Métodos](#2-implementación-de-nuevos-métodos)
3. [Resolución de EDOs de Orden Superior y Sistemas de EDOs](#3-resolución-de-edos-de-orden-superior-y-sistemas-de-edos)
4. [Resolución de Sistemas de Ecuaciones Lineales](#4-resolución-de-sistemas-de-ecuaciones-lineales)
5. [Integración por Aproximación](#5-integración-por-aproximación)

---

## 1. Mejorar Visualización del Gráfico en Mobile

<span style="background:#0d9488;color:#fff;padding:4px 14px;border-radius:8px;font-weight:700;"> ✅ YA REALIZADO — 18/05/2026</span>

### Problema original

El gráfico de funciones (`<ResponsiveContainer>` de Recharts en `SolverPage`) no se adaptaba a pantallas móviles. En viewports menores a 480 px el SVG se cortaba y era imposible interactuar.

### Solución aplicada

Se agregaron reglas CSS responsivas en `src/styles/solver.css`:
- El contenedor del gráfico usa `overflow-x: auto` + `min-width: 280px`.
- Los ejes reducen su font-size en `@media (max-width: 600px)`.
- Se eliminaron márgenes fijos en `margin` del `<LineChart>`.

### Archivos tocados
| Archivo | Cambio |
|---------|--------|
| `src/styles/solver.css` | Media queries para el contenedor `.graph-container` y ejes |

---

## 2. Implementación de Nuevos Métodos

<span style="background:#0d9488;color:#fff;padding:4px 14px;border-radius:8px;font-weight:700;"> ✅ YA REALIZADO — 18/05/2026</span>

### Métodos a implementar

| Método | Tipo | Estado |
|--------|------|--------|
| Euler (EDO numérica) | numérico — `numericalMethods.js` | ✅ Realizado |
| Runge-Kutta 4 (EDO numérica) | numérico — `numericalMethods.js` | ✅ Realizado |
| EDOs simbólicas (SymPy) | simbólico — motor Python | ✅ Realizado (ver ítem 3) |

### Dónde implementar

- **Ruta:** `/calculadora` → pestaña `"edo"` en `OperationSelector` → sub-pestaña **Euler / RK4**.
- **Página:** `src/pages/CalculadoraPage.jsx`
- **Componente:** `src/components/EdoNumerico.jsx` — paneles Entrada/Resultado, tabla de iteraciones y gráfico Recharts (misma línea visual que `SolverPage`).
- **Motor numérico:** `edoEuler()` y `edoRK4()` en `src/utils/numericalMethods.js` (parseo de `f(t,y)` con math.js, 100 % client-side).

### Estructura esperada del componente

```
+--------------------------------------------------+
|  Panel izquierdo (Configuración)                  |
|  - Selector: Euler / RK4                         |
|  - Campo: f(t, y)                                |
|  - Campo: t₀, y₀, h, t_final                    |
|  - Botón: Calcular                               |
+--------------------------------------------------+
|  Panel derecho (Resultado)                        |
|  - Tabla de iteraciones (t, y)                    |
|  - Gráfico T(t) vs y(t) (Recharts)               |
|  - Análisis de convergencia (opcional)            |
+--------------------------------------------------+
```

### Notas técnicas

- Los métodos numéricos Euler y RK4 **no requieren** el motor Python — corren 100% client-side con `math.js`.
- El gráfico usa `<ResponsiveContainer>` de Recharts, igual que en `SolverPage`.
- Considerar gráficos 3D (Three.js / react-three-fiber) como mejora futura, no como requisito inicial.

### Archivos entregados

| Archivo | Rol |
|---------|-----|
| `src/components/EdoNumerico.jsx` | UI Euler / RK4 |
| `src/utils/numericalMethods.js` | `parseOdeRhs`, `edoEuler`, `edoRK4` |
| `src/pages/CalculadoraPage.jsx` | Sub-tab `numerico` bajo EDO |
| `src/styles/calculadora.css` | Estilos `.edo-numerico` |

---

## 3. Resolución de EDOs de Orden Superior y Sistemas de EDOs

<span style="background:#0d9488;color:#fff;padding:4px 14px;border-radius:8px;font-weight:700;"> ✅ YA REALIZADO — 18/05/2026</span>

### Qué se implementó

Resolución simbólica de ecuaciones diferenciales ordinarias (lineales y no lineales) de orden superior, más sistemas de EDOs con condiciones iniciales. Todo corre en el motor Python (SymPy / FastAPI).

### Arquitectura

```
Frontend (React)                    Backend (Python)
┌─────────────────┐    POST /api/math/ode/solve    ┌──────────────────────┐
│ CalculadoraPage  │ ────────────────────────────→  │ numerika_math_engine │
│  → EDOOrdenSuperior │                              │  .py (SymPy)         │
│  → SistemaEDO    │ ←── {solutions, steps, ...} ─ │                      │
└─────────────────┘                                └──────────────────────┘
```

### Archivos que conforman la feature

| Archivo | Rol |
|---------|-----|
| `src/pages/CalculadoraPage.jsx` | Página principal, incluye `OperationSelector` con tab `"edo"` |
| `src/components/OperationSelector.jsx` | Barra de tabs (Derivar, Integrar, Simplificar, EDO, ...) |
| `src/components/HigherOrderStates.jsx` | Componente `EDOOrdenSuperior` — input de EDO + C.I. |
| `src/components/EDOSystem.jsx` | Componente `SistemaEDO` — input de sistema de EDOs |
| `src/components/EDOMathParts.jsx` | `EDOMathExpr` y `EDOStepList` — renderizan LaTeX con KaTeX |
| `src/components/MathComponents.jsx` | `MathRenderer` — wrapper de KaTeX |
| `src/hooks/useMathEngine.js` | Hook `useMathEngine()` → `.odeSolve()` y `.odeSystem()` |
| `backend/numerika_math_engine.py` | FastAPI + SymPy — endpoints `/ode/solve` y `/ode/system` |

### Endpoints del motor Python

| Método | Ruta | Cuerpo esperado | Respuesta |
|--------|------|-----------------|-----------|
| POST | `/api/math/ode/solve` | `{ equation, initial_conditions: [{d, at, v}] }` | `{ general_solution, particular_solution, steps, classification }` |
| POST | `/api/math/ode/system` | `{ equations: [...], initial_conditions: {x: val, y: val} }` | `{ solutions: {x: ..., y: ...}, steps, eigenvalues }` |

### UI entregada

- Botón **EDO** en la barra de operaciones de la Calculadora Simbólica.
- Sub-pestañas: **Orden Superior** y **Sistema**.
- Resultados en **LaTeX** (KaTeX) en el panel de Resultado.
- UI alineada al resto de la página (paneles Entrada/Resultado, ejemplos predefinidos, errores amigables con `FriendlyErrorBox`).

---

## 4. Resolución de Sistemas de Ecuaciones Lineales

<span style="background:#0d9488;color:#fff;padding:4px 14px;border-radius:8px;font-weight:700;"> ✅ YA REALIZADO — 18/05/2026</span>

### Métodos a implementar

- Eliminación de Gauss
- Gauss-Jordan
- Regla de Cramer
- Jacobi (iterativo)
- Gauss-Seidel (iterativo)

### Dónde implementar

- **Ruta:** `/solver` — agregar los nuevos métodos al array `METHODS` ya existente.
- **Página:** `src/pages/SolverPage.jsx`
- **Constantes:** `src/constants/data.js` → agregar entradas a `METHODS` y `METHOD_GUIDE`.
- **Motor:** dos opciones (no excluyentes):
  1. **Client-side (math.js):** resolver sistemas 2×2 y 3×3 directo en JS.
  2. **SymPy (motor Python):** POST a un nuevo endpoint `/api/math/linsolve` (a crear en `numerika_math_engine.py`).

### Estructura esperada del componente

Para métodos directos (Gauss, Cramer) se usará entrada tipo **matriz editable** (similar a `AnalisisCircuitos.jsx` en `src/utils/AnalisisCircuitos.jsx`):

```
Coeficientes [A]          Términos independientes [b]
┌─────────────┐           ┌─────┐
│ a₁₁ a₁₂ a₁₃ │           │ b₁  │
│ a₂₁ a₂₂ a₂₃ │           │ b₂  │
│ a₃₁ a₃₂ a₃₃ │           │ b₃  │
└─────────────┘           └─────┘
```

Para métodos iterativos (Jacobi, Seidel): entrada tipo vector de valores iniciales + selector de tolerancia.

### Notas técnicas

- Motor en `src/utils/linearSystems.js` (`gaussElimination`, `gaussJordan`, `cramerRule`, `jacobiMethod`, `gaussSeidelMethod`).
- `resolverGauss()` / `resolverJacobi()` en `systemEquation.js` reexportan la nueva implementación (compat. con `AnalisisCircuitos.jsx`).
- UI: `src/components/LinearSystemSolver.jsx` — matriz editable 2×2 y 3×3, integrado en `/solver` vía tabs «Sistemas lineales».

### Archivos entregados

| Archivo | Rol |
|---------|-----|
| `src/utils/linearSystems.js` | Métodos directos e iterativos + pasos |
| `src/components/LinearSystemSolver.jsx` | Paneles Entrada / Resultado |
| `src/pages/SolverPage.jsx` | Tabs raíces + sistemas lineales |
| `src/constants/data.js` | `LINEAR_METHODS`, guías y detalles |
| `src/constants/methodDocs.js` | Tooltips de métodos lineales |
| `src/styles/solver.css` | Estilos `.linsys-*` |

---

## 5. Integración por Aproximación

<span style="background:#22c55e;color:#000;padding:2px 10px;border-radius:6px;font-weight:700;font-size:0.85em;"> ✅ YA REALIZADO</span>

### Métodos implementados

| Método | Tipo | Precisión | Restricción de n |
|--------|------|-----------|------------------|
| Trapecio | compuesto | O(h²) | n ≥ 1 |
| Simpson 1/3 | compuesto | O(h⁴) | n par |
| Simpson 3/8 | compuesto | O(h⁴) | n múltiplo de 3 |

### Arquitectura

- **Motor 100% client-side**: las tres reglas se implementaron en `src/utils/numericalMethods.js` como `trapecio(expr, a, b, n)`, `simpson13(...)` y `simpson38(...)`, reusando `parseFunction()` (math.js, con preprocesado de `sen/ln/log`).
- Cada función devuelve `{ method, methodLabel, integral, h, order, summary, iterations, nodePoints, curvePoints }`, listo para tabla y gráfico.
- Validación robusta: límites numéricos, n entero ≥ 1, paridad/múltiplo de 3 según el método, máximo 5000 subintervalos, y soporte de a > b (se invierte y se aplica signo).

### UI

- Nueva pestaña **Integración** en `OperationSelector` (`includeIntegracion`) dentro de `/calculadora`.
- Componente `IntegracionNumerica.jsx`:
  - Panel izquierdo: tabs (Trapecio / Simpson 1/3 / Simpson 3/8), campo f(x), campos a y b, número de subintervalos con `step` adaptativo (1/2/3) y auto-ajuste al cambiar de método, ejemplos rápidos.
  - Panel derecho: tarjetas resumen (f, intervalo, n·h, I aprox.), fórmula del método, gráfico con `ComposedChart` (curva continua + área sombreada con `<Area>` gradiente teal + nodos), y tabla de paneles (`Trapecio`: 2 nodos por panel; `Simpson 1/3`: 3 nodos; `Simpson 3/8`: 4 nodos).
- Errores amigables vía `FriendlyErrorBox`.

### Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/utils/numericalMethods.js` | Nuevas funciones `trapecio`, `simpson13`, `simpson38` + helpers `_validateIntegrationParams`, `_buildCurvePoints`. |
| `src/components/IntegracionNumerica.jsx` | NUEVO — UI completa del modo integración numérica. |
| `src/components/MathComponents.jsx` | `OperationSelector` ahora acepta `includeIntegracion` y suma el tab `∫ₐᵇ`. |
| `src/pages/CalculadoraPage.jsx` | Render condicional del modo integración + se excluye del historial simbólico. |
| `src/styles/calculadora.css` | Bloque `.intnum-*` (tabs, summary grid, fórmula, gráfico y tabla, responsive). |

---

## 6. Configuración del Entorno para Presentación Local

<span style="background:#eab308;color:#000;padding:2px 10px;border-radius:6px;font-weight:700;font-size:0.85em;"> PENDIENTE — PRIORIDAD ALTA</span>

### Problema

El motor matemático (Python/SymPy en `backend/numerika_math_engine.py`) **no corre en producción** (Vercel). Solo está disponible en local. El frontend intenta conectarse a `VITE_MATH_ENGINE_URL` y si no está configurado, falla silenciosamente o usa un default hardcodeado.

Para la presentación con los profesores (Demo Day) todo debe funcionar en local, incluyendo la calculadora simbólica y la resolución de EDOs.

### Qué hay que hacer

| Archivo | Acción |
|---------|--------|
| `.env.example` | ✅ Agregar `VITE_MATH_ENGINE_URL=http://localhost:8000` |
| `.env` (cada dev) | ⚠️ Asegurarse de que la variable esté presente antes del demo |

### Cómo verificar que funciona

```bash
# 1. Iniciar el motor Python
cd backend
.\venv\Scripts\activate
python numerika_math_engine.py

# 2. En otra terminal, iniciar frontend + API
npm run start:local

# 3. Abrir http://localhost:5173/calculadora → pestaña EDO
#    Si el motor responde, los cálculos devuelven LaTeX.
#    Si no responde, useMathEngine.js muestra error: "No se pudo conectar..."
```

### Notas

- El default hardcodeado está en `src/hooks/useMathEngine.js:13-14`:
  ```js
  const DEFAULT_URL = import.meta.env.VITE_MATH_ENGINE_URL || "http://localhost:8000";
  ```
- En producción (Vercel) esta variable **no debe definirse** para evitar llamadas a un motor inexistente. La UI ya tolera la ausencia mostrando "motor no disponible" en lugar de romperse.

---

> **Al finalizar todos estos features se lanzará la versión estable 1.0 de NumérikaAI.**
