# 📰 TEAM_UPDATE — NumérikaAI

> Bitácora cronológica de cambios. Nuevo arriba, viejo abajo.

---

## Sesión 19-may-2026 — Visualización 3D, sistemas lineales, integración numérica y mejoras de IKA

### 1. Visualización 3D del Solver de EDOs

Se rediseñó el **modal de gráfico 3D** que aparece en los componentes EDO (Euler/RK4 y Sistema EDO).

| Cambio | Detalle |
|---|---|
| Overlay full-screen | `Plot3DModal` ahora se renderiza vía `createPortal(document.body)` para que el oscurecimiento cubra **toda la pantalla**, sin importar el `transform` de los contenedores padre. |
| Ejes visibles | Se reescribió `NUMERIKA_3D_LAYOUT` en `src/utils/edoPlot3D.js`: gridcolor, zerolinecolor, backgrounds de los ejes ajustados para que se distingan sobre el fondo crema de NumérikaAI. |
| Modal más grande | `max-width: 1400px`, `height: 90vh`. Plotly modebar reposicionada arriba a la izquierda; se quitaron los botones redundantes (`toImage`, `sendDataToCloud`). |
| Botón "Exportar PNG" dedicado | Movido al header del modal, ya no compite con la modebar de Plotly. |
| `Plot3DTrigger` reutilizable | Nuevo componente con icono SVG y label "Ver en 3D" usado en `EdoNumerico` y `EDOSystem`. |
| Subtítulo en el modal | Cada caller pasa contexto extra (`"Sistema EDO · trayectoria"`, etc.). |
| Lock de scroll | Mientras el modal está abierto, `body { overflow: hidden }`. |

**Archivos**: `src/components/Plot3DModal.jsx`, `src/components/Plot3DTrigger.jsx` (nuevo), `src/components/EdoNumerico.jsx`, `src/components/EDOSystem.jsx`, `src/styles/plot3d.css`, `src/utils/edoPlot3D.js`.

---

### 2. Solver de Sistemas de Ecuaciones Lineales (FEATURES §4 ✅)

Se implementó el solver de Ax = b directamente en `/solver/:methodId`. Ahora la página tiene **dos grupos** de tabs: "Raíces de f(x)" y "Sistemas lineales Ax = b".

**Métodos:**

| ID | Método | Tipo | Salida especial |
|---|---|---|---|
| `gauss` | Eliminación de Gauss | directo | `steps` con pivoteo parcial |
| `gaussjordan` | Gauss-Jordan | directo | `steps` hasta RREF |
| `cramer` | Regla de Cramer | directo | Cada `det(Aᵢ)` |
| `jacobi` | Jacobi | iterativo | `iterations` + warning si no es diagonalmente dominante |
| `gaussseidel` | Gauss-Seidel | iterativo | idem Jacobi pero con actualización in-place |

**Arquitectura:**
- `src/utils/linearSystems.js` — Motor: matrix utils, pivoteo, validación, API unificada `solveLinearSystem(methodId, ...)`.
- `src/components/LinearSystemSolver.jsx` — UI: matriz aumentada 2×2 o 3×3 editable + vector inicial / tolerancia / max iter (para iterativos) + tabla de pasos o iteraciones + ejemplos.
- `src/utils/systemEquation.js` — Shim de compat: re-exporta `resolverGauss` y `resolverJacobi` para que `AnalisisCircuitos.jsx` siga funcionando.
- `src/components/MethodTypeTag.jsx` — Soporta los nuevos tipos `lineal-directo` y `lineal-iterativo` con styling propio.
- `src/pages/SolverPage.jsx` — Render condicional según el `activeMethod`.

---

### 3. Integración por Aproximación (FEATURES §5 ✅)

Nueva pestaña **Integración** en `/calculadora` (`OperationSelector` con prop `includeIntegracion`).

| ID | Método | Restricción de n | Error |
|---|---|---|---|
| `trapecio` | Trapecio compuesto | n ≥ 1 | O(h²) |
| `simpson13` | Simpson 1/3 | n par | O(h⁴) |
| `simpson38` | Simpson 3/8 | n múltiplo de 3 | O(h⁴) |

- Motor 100% client-side en `numericalMethods.js` (`trapecio`, `simpson13`, `simpson38`).
- Componente nuevo `IntegracionNumerica.jsx`: tarjetas resumen (f, intervalo, n·h, I), fórmula del método, gráfico `ComposedChart` con curva + área sombreada (`<Area>` gradiente teal) + nodos, y tabla específica por método (Trapecio: 2 nodos/panel; Simpson 1/3: 3; Simpson 3/8: 4).
- Validación robusta: paridad/múltiplo de 3, máximo 5000 subintervalos, soporte de `a > b` con cambio de signo, ajuste automático del `step` del input numérico según el método.
- Estilos `.intnum-*` en `calculadora.css` con responsive a 768/480 px.

---

### 4. IKA — contextual real, UI integrada y meta-info

Se atacaron los 4 puntos pedidos por el equipo:

#### 4.1 Contexto en TODAS las páginas
Nuevo componente `IkaRouteWatcher` montado en `App.jsx`. Vigila la ruta con `useLocation` + `useParams` y matchea contra un mapa `ROUTE_CONTEXTS` que cubre todas las rutas (`/`, `/solver`, `/comparar`, `/metodos`, `/calculadora`, `/aplicaciones`, `/aplicaciones/:appId`, `/login`, `/register`).

Las páginas con detalle (Solver, Comparador, Calculadora) **sobreescriben** ese contexto base con info específica (función, parámetros, resultado, estado del motor, operación activa, subtab EDO).

**Resultado**: el badge "👀 Viendo: …" del widget se actualiza solo cuando el usuario navega.

#### 4.2 Burbujas que no se colapsan
Reescritura de los estilos `.ika-bubble`:
- `box-sizing: border-box`, `min-width: 0`, `overflow-wrap: anywhere`, `word-break: break-word`.
- `.ika-bubble .katex-display` con `overflow-x: auto` → las fórmulas anchas hacen scroll horizontal dentro de la burbuja.
- `code` / `pre` con `max-width: 100%` y scroll.
- Listas (`ul`, `ol`) con padding contenido.

#### 4.3 Modelo y cuota restante
- Backend: nuevo endpoint público `GET /api/ai/status` que devuelve:
  ```json
  { "model": "gemini-2.5-flash",
    "geminiConfigured": true,
    "rateLimit": { "max": 10, "windowMs": 60000, "used": 0, "remaining": 10, "resetInMs": 60000 } }
  ```
- Nueva función `getRateLimitStatus(ip)` en `src/services/ai.js` que inspecciona el rate limiter **sin** incrementar.
- Frontend: dos chips en el header del widget — `[● gemini-2.5-flash]` (modelo) y `[● 7/10 ·/min]` (cuota), con color teal/amarillo/rojo según queden >40%/<40%/0% peticiones. Se refresca al abrir el chat y después de cada mensaje.

#### 4.4 Widget más grande
`width: 380px → 440px`, `height: 520px → 640px`, `max-width: calc(100vw - 48px)`. Responsive en mobile mejorado.

**Archivos**: `src/components/IkaRouteWatcher.jsx` (nuevo), `src/components/IkaWidget.jsx`, `src/styles/ika.css`, `src/services/ai.js`, `api/index.js`, `src/App.jsx`, `src/pages/CalculadoraPage.jsx`.

---

### 5. Migración a Gemini 2.5 Flash

El modelo `gemini-2.0-flash` ya no tiene cuota en el free tier de Google (`limit: 0` para proyectos nuevos). Se migró a **`gemini-2.5-flash`** que sigue con cuota free y respondió correctamente en los smoke tests.

- `src/services/ai.js`: constante `GEMINI_MODEL` configurable por env (`GEMINI_MODEL=…` en `.env`).
- Ambas funciones (`generateExplanation`, `chatWithIka`) usan la constante.
- Scripts auxiliares nuevos en `scripts/`:
  - `test-gemini.mjs [modelo]` — Smoke de la API key contra cualquier modelo.
  - `list-gemini-models.mjs` — Lista los 34 modelos disponibles para la key.
  - `test-ika-flow.mjs` — E2E: register → POST `/api/ai/chat` → reply.

---

### 6. Bug fix — detección de duplicate-email en SQLite

El handler de `/api/auth/register` chequeaba solo `err.code === '23505'` (PostgreSQL). En SQLite el código es `SQLITE_CONSTRAINT_UNIQUE` y el mensaje `UNIQUE constraint failed: users.email`, así que devolvía un genérico `500`.

Ahora detecta los tres patrones y responde `400` con `"El email ya está registrado."` independientemente del motor.

**Archivo**: `api/index.js`.

---

### 7. `.env` listo para desarrollo

Se creó `.env` (ignorado por git, verificado con `git check-ignore`) con:

```
PORT=3000
NODE_ENV=development
JWT_SECRET=<96-char hex random>
GEMINI_API_KEY=<la key de Google AI Studio>
VITE_API_URL=http://localhost:3000
VITE_MATH_ENGINE_URL=http://localhost:8000
```

> `DATABASE_URL` queda comentada — el sistema usa SQLite local (`numerika_local.db`) automáticamente.

---

### 8. Documentación

- **NUEVO** `docs/CODEMAP.md` — Mapa completo del proyecto (arquitectura, rutas, endpoints, módulos, data flows).
- `docs/TEAM_UPDATE.md` — Este archivo.
- `docs/PROFESSOR_GUIDE.md` — Actualizado con los demos nuevos.

---

### 9. Qué queda pendiente

| Feature | Sección en FEATURES.md | Estado |
|---|---|---|
| Configuración del entorno para Vercel (prod) | §6 | ⚠️ **Pendiente** — el equipo decidió postergarlo. Acción: documentar variables de entorno para Vercel + verificar manejo "motor no disponible" + agregar instrucciones de Demo Day. |

---

### 10. Verificación

| Check | Resultado |
|---|---|
| `npm run lint` | sin warnings nuevos |
| `npm run build` | ✅ pasa (26.87s, ~2.4 MB bundle) |
| `node scripts/test-gemini.mjs gemini-2.5-flash` | ✅ Gemini responde en 4s |
| `node scripts/test-ika-flow.mjs` | ✅ register → JWT → POST `/api/ai/chat` → reply |
| `GET /api/ai/status` | ✅ devuelve `{ model, rateLimit }` |
| Smoke manual de IKA en `/solver/biseccion`, `/calculadora`, `/comparar` | ✅ contexto cambia y las respuestas con KaTeX no desbordan |

---

## Sesión 18-may-2026 — EDOs simbólicas, motor Python y normalización

### 1. Pestaña EDO en la Calculadora Simbólica

Apareció una pestaña más junto a Derivar, Integrar, etc.: **EDO** (∂). Dos sub-modos:
1. **Orden Superior** — `y'', y'` y condiciones iniciales configurables.
2. **Sistema** — varias ecuaciones tipo `x' = …`, `y' = …` con C.I. en `t = 0`.

Archivos nuevos/tocados: `src/pages/CalculadoraPage.jsx`, `src/components/HigherOrderStates.jsx`, `src/components/EDOSystem.jsx`, `src/components/EDOMathParts.jsx`, `src/components/MathComponents.jsx`, `src/hooks/useMathEngine.js`, `backend/numerika_math_engine.py`.

### 2. Motor matemático (Python + SymPy)

| Método | Ruta | Uso |
|---|---|---|
| POST | `/api/math/ode/solve` | EDO de orden superior + lista de condiciones iniciales `[{d, at, v}]` |
| POST | `/api/math/ode/system` | Array de ecuaciones + objeto de C.I. por variable |

Parsea notación habitual (`y''`, `x'`, `exp(x)`, etc.), resuelve con `dsolve` de SymPy y devuelve soluciones en formato `{ plain, latex }`.

### 3. Resultados en LaTeX

- Backend genera **LaTeX** con `sympy.latex()`.
- Frontend renderiza con **KaTeX** (`MathRenderer`).
- Desplegable **Procedimiento** con pasos titulados.
- Si el motor no responde: mensaje "No se pudo conectar..." — no crashea.

### 4. Normalización de nombres

| Antes | Después | Motivo |
|---|---|---|
| `src/utils/SystemEcuation.js` | `src/utils/systemEquation.js` | camelCase + typo "Ecuation" → "Equation" |

Convención adoptada:
- Componentes React (`.jsx`) → PascalCase
- Utilidades (`.js`) → camelCase
- Estilos (`.css`) → kebab-case
- Python backend → snake_case

### 5. `FEATURES.md` reescrito para agentes

Estructura de tabla + rutas exactas + diagramas ASCII. Badges de estado (✅/⚠️). Se sumó la sección **#6 "Configuración del Entorno para Presentación Local"** con prioridad alta.

### 6. `.env.example` actualizado

Se agregó `VITE_MATH_ENGINE_URL=http://localhost:8000`. Default hardcodeado en `src/hooks/useMathEngine.js`.

---

## Checklist rápido para probar todo (versión 19-may)

```bash
# 1. .env presente con GEMINI_API_KEY válida y JWT_SECRET
# 2. Iniciar todo
npm run start:local

# 3. Tests rápidos
#    /solver/biseccion         → f(x)=x^2-x-2, [1,3]            ✅ tabla + gráfico + IKA con contexto
#    /solver/gauss             → matriz 3x3                       ✅ steps + solución
#    /calculadora → Derivar    → x^3                              ✅ motor Python responde con LaTeX
#    /calculadora → EDO        → "Armónico simple" y'' + y = 0    ✅ solución + procedimiento
#    /calculadora → Integ.     → x^2 en [0,1], n=6, Trapecio      ✅ I ≈ 0.34375 + gráfico con área
#    /aplicaciones/circuitos                                       ✅ corrientes I1,I2,I3
#    IKA widget                                                    ✅ chips gemini-2.5-flash + cuota
#    Cambiar de página con IKA abierto                             ✅ badge "Viendo: …" cambia
#    Smoke E2E
node scripts/test-ika-flow.mjs                                   # ✅ user → chat → reply
```

Cualquier duda sobre el motor Python en producción: **postergado al ítem 6 de `FEATURES.md`**. Para Demo Day todo corre en local.
