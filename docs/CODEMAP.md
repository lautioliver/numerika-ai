# 🗺️ CodeMap — NumérikaAI

> Mapa **denso** del código, pensado para que cualquier integrante (o agente de IA) pueda orientarse en minutos. Generado el **19-may-2026**.

---

## 1. Visión general

**NumérikaAI** es una plataforma web educativa en español para que estudiantes de ingeniería **entiendan** los métodos numéricos paso a paso, con visualización interactiva, comparación de métodos y un asistente IA (IKA) que ve qué está viendo el usuario.

- **Frontend**: React 19 + Vite 7 SPA con cinco páginas principales.
- **Backend**: Express 5 (auth + IA + persistencia).
- **Motor matemático**: Python 3 + FastAPI + SymPy (solo simbólico).
- **DB**: PostgreSQL (prod) con fallback automático a SQLite (dev).
- **IA**: Gemini 2.5 Flash vía `@google/generative-ai`.
- **Deploy**: Vercel (frontend + Express como serverless). El motor Python **no** corre en prod.

---

## 2. Topología de servicios

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────────┐
│  Vite Dev / SPA      │    │  Express 5          │    │  Math Engine (Python)   │
│  http://:5173        │    │  http://:3000       │    │  http://:8000           │
│                      │    │                     │    │                         │
│  • React 19          │    │  • /api/auth/*      │    │  • /api/math/derive     │
│  • React Router 7    │    │  • /api/ai/chat     │    │  • /api/math/integrate  │
│  • Recharts (2D)     │────▶  • /api/ai/explain  │    │  • /api/math/simplify   │
│  • Plotly.js (3D CDN)│    │  • /api/ai/status   │    │  • /api/math/factorize  │
│  • math.js           │    │  • /api/ai/chat/.. │    │  • /api/math/solve      │
│  • KaTeX             │    │                     │    │  • /api/math/ode/solve  │
│                      │    │                     │    │  • /api/math/ode/system │
└──────────┬───────────┘    └──────────┬──────────┘    └──────────┬──────────────┘
           │                           │                          │
           │  fetch ${VITE_API_URL}    │  query(sql)              │  fetch (FastAPI)
           │                           ▼                          │
           │                  ┌────────────────────┐              │
           └─────────────────▶│ PostgreSQL ‖ SQLite│◀─────────────┘
                              │ users, ika_chats   │       (no toca DB)
                              └────────────────────┘
```

| Servicio | Puerto | Stack | Obligatorio para… |
|---|---|---|---|
| Vite dev server | 5173 | React 19 + Vite 7 | Toda la UI |
| Express API | 3000 | Node 22, Express 5 | Login, IKA, explicaciones IA |
| Math Engine | 8000 | Python 3, FastAPI, SymPy | Calculadora simbólica + EDOs |
| PostgreSQL | 5432 | (opcional, Docker) | Solo en prod; en dev usa SQLite |

---

## 3. Layout del repositorio

```
numerika-ai/
├── api/
│   └── index.js                # ⚡ Express app (entry serverless en Vercel)
├── backend/
│   ├── numerika_math_engine.py # 🐍 Motor SymPy/FastAPI (8 endpoints)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── ode_req.json            # Cache SQLite del motor
├── scripts/
│   ├── test-gemini.mjs         # Smoke: ¿la key de Gemini anda?
│   ├── list-gemini-models.mjs  # Qué modelos Gemini puede usar esta key
│   └── test-ika-flow.mjs       # E2E: register → /api/ai/chat → reply
├── src/
│   ├── main.jsx                # React entry (envuelve con AuthProvider + IkaProvider + Router)
│   ├── App.jsx                 # Rutas + imports CSS + monta IkaWidget + IkaRouteWatcher
│   ├── pages/                  # 10 páginas (ver §5)
│   ├── components/             # ~25 componentes (ver §6)
│   ├── context/
│   │   ├── AuthContext.jsx     # JWT + /api/auth/me al cargar
│   │   └── IkaContext.jsx      # `{ contextData, updateContext }` — qué ve IKA
│   ├── hooks/
│   │   └── useMathEngine.js    # Wrapper REST del motor Python (con cache)
│   ├── services/
│   │   └── ai.js               # 🤖 Gemini client (chatWithIka + generateExplanation + rate limiter)
│   ├── config/
│   │   └── db.js               # 🗃️ PostgreSQL → SQLite fallback automático
│   ├── middleware/
│   │   └── auth.js             # generateToken + authMiddleware
│   ├── constants/
│   │   ├── data.js             # Catálogo de métodos + cards + ejemplos
│   │   └── methodDocs.js       # Docs inline (tooltips de tabs)
│   ├── utils/                  # Motores numéricos y helpers (ver §7)
│   └── styles/                 # 14 archivos CSS, uno por feature/página
├── start-local.js              # Spawn de los 3 servicios con logs coloreados
├── start-math-engine.bat       # Atajo Windows para venv + python motor
├── vite.config.js
├── vercel.json                 # Rewrites: /api/* → api/index.js
├── docker-compose.yml          # PostgreSQL + Redis
├── .env.example
├── AGENTS.md                   # Quick start para agentes de IA
├── FEATURES.md                 # Estado de features (5 hechas, 1 pendiente)
├── README.md
├── LOCAL_SETUP.md
└── docs/
    ├── CODEMAP.md              # 📍 ESTE archivo
    ├── PROFESSOR_GUIDE.md      # Guía de demo para profesores
    ├── TEAM_UPDATE.md          # Bitácora de cambios por sesión
    └── README.md               # Índice de docs
```

---

## 4. Rutas del frontend (React Router 7)

| Ruta | Componente | Auth | Notas |
|---|---|:---:|---|
| `/` | `HomePage` | ❌ | Landing con cards |
| `/solver` | `SolverPage` | ❌ | Redirige a `/solver/biseccion` |
| `/solver/:methodId` | `SolverPage` | ❌ | **2 modos**: raíces de f(x) o sistemas lineales (Gauss/Cramer/Jacobi/…) |
| `/comparar` | `ComparisonPage` | ❌ | Corre los 5 métodos de raíces en paralelo |
| `/metodos` | `MethodsPage` | ❌ | Catálogo |
| `/calculadora` | `CalculadoraPage` | ❌ | **7 modos**: derive · integrate · simplify · factorize · solve · `edo` · `integracion` |
| `/aplicaciones` | `Amn` | ❌ | Listado de simuladores |
| `/aplicaciones/:appId` | `Amn` | ❌ | Simulador (`semaforo`, `estructura`, `circuitos`, `enfriamiento`) |
| `/login` | `LoginPage` | ❌ | |
| `/register` | `RegisterPage` | ❌ | |
| `*` | `<Navigate to="/" />` | — | Fallback |

`/docs` está deshabilitada (comentada en `App.jsx`).

---

## 5. Páginas (`src/pages/`)

| Archivo | Rol | Componentes que importa | Contexto IKA |
|---|---|---|---|
| `HomePage.jsx` | Landing, navega a métodos | `Card` | Auto vía `IkaRouteWatcher` |
| `SolverPage.jsx` | **Resolver f(x)=0 + Ax=b** | `LinearSystemSolver`, `InteractiveChart`, `MethodTooltip`, `FriendlyErrorBox`, `GuideAccordion` | Detallado: método, función, params, resultado |
| `ComparisonPage.jsx` | Compara métodos de raíces | `Recharts BarChart` | Detallado: f(x), [a,b], resultados |
| `MethodsPage.jsx` | Catálogo navegable | `Card` | Auto |
| `CalculadoraPage.jsx` | **Calculadora simbólica + EDO + integración numérica** | `MathInput`, `OperationSelector`, `EDOOrdenSuperior`, `SistemaEDO`, `EdoNumerico`, `IntegracionNumerica`, `MathResult` | Detallado: operación + subtab EDO + expr + resultado |
| `Amn.jsx` | Aplicaciones de ingeniería | `TrafficLights`, `StructuralAnalysis`, `AnalisisCircuitos`, `CoolingHardware` | Auto |
| `LoginPage.jsx` / `RegisterPage.jsx` | Auth | `Form`, `Field` | Auto |
| `Solver.jsx` | **legacy** (no en routing) | — | — |
| `Documentacion.jsx` | **legacy** (route deshabilitada) | — | — |

---

## 6. Componentes (`src/components/`)

### Núcleo / layout
- `Navigation.jsx` — Barra superior con links + login/register.
- `Footer.jsx`
- `Card.jsx`, `Form.jsx`, `Field.jsx` — Atómicos.

### Solver — raíces
- `InteractiveChart.jsx` — Recharts con zoom (+/−/reset) y línea vertical en la raíz.
- `MockGraph.jsx` — Loader inicial cuando no hay data.
- `MethodTooltip.jsx` — Hover en tabs muestra ventajas/limitaciones/complejidad.
- `MethodTypeTag.jsx` — Tag con color por tipo (`cerrado` / `abierto` / `lineal-directo` / `lineal-iterativo`).
- `GuideAccordion.jsx` — Procedimiento paso a paso desplegable.

### Solver — sistemas lineales
- `LinearSystemSolver.jsx` — Matriz aumentada 2×2 / 3×3 editable + 5 métodos (`gauss`, `gaussjordan`, `cramer`, `jacobi`, `gaussseidel`).

### Calculadora simbólica
- `MathComponents.jsx` — `MathRenderer` (KaTeX), `MathInput`, `OperationSelector`, `MathResult`.
- `EDOMathParts.jsx` — `EDOMathExpr`, `EDOStepList` (renderizan strings o `{plain,latex}`).
- `HigherOrderStates.jsx` — `EDOOrdenSuperior` (orden superior + C.I.).
- `EDOSystem.jsx` — `SistemaEDO` (varias EDOs + C.I.).
- `EdoNumerico.jsx` — Euler / RK4 client-side + integra `Plot3DModal`.
- `IntegracionNumerica.jsx` — **NUEVO** Trapecio · Simpson 1/3 · Simpson 3/8.

### Plot 3D
- `Plot3DModal.jsx` — Modal full-screen (vía `createPortal`) con Plotly.js (CDN).
- `Plot3DTrigger.jsx` — Botón "Ver en 3D" reutilizable.

### IA · IKA
- `IkaWidget.jsx` — FAB + chat con historial + chips de modelo y cuota.
- `IkaRouteWatcher.jsx` — **NUEVO** Vigila la ruta y actualiza `IkaContext` automáticamente para TODAS las páginas.

### Errores
- `FriendlyErrorBox.jsx` — Renderiza mensajes amigables (severidad, sugerencias, detalle técnico colapsable).

---

## 7. Utilidades (`src/utils/`)

| Archivo | Exporta | Qué hace |
|---|---|---|
| `numericalMethods.js` | `parseFunction`, `biseccion`, `reglaFalsa`, `newtonRaphson`, `secante`, `puntoFijo`, `getFunctionPoints`, `detectMultipleRoots`, `parseOdeRhs`, `edoEuler`, `edoRK4`, **`trapecio`**, **`simpson13`**, **`simpson38`** | Motor numérico 100% client-side. Usa `math.js` (sandbox, derivada simbólica). |
| `linearSystems.js` | `gaussElimination`, `gaussJordan`, `cramerRule`, `jacobiMethod`, `gaussSeidelMethod`, `solveLinearSystem`, `LINEAR_SYSTEM_EXAMPLES`, **`resolverGauss` y `resolverJacobi` (re-export legacy)** | Solver de sistemas lineales. Devuelve `iterations` o `steps` según método. |
| `systemEquation.js` | `resolverGauss`, `resolverJacobi` (re-exports) | **Shim de compatibilidad** para `AnalisisCircuitos.jsx`. |
| `edoPlot3D.js` | `can3D`, `buildSurfacePlotData`, `buildTrajectoryPlotData`, `NUMERIKA_3D_LAYOUT`, `loadPlotly`, … | Construye los traces y layout 3D temáticos de NumérikaAI. |
| `convergenceAnalyzer.js` | `analyzeConvergence` | Genera explicación pedagógica de por qué convergió/diverge un método. |
| `graphUtils.js` | helpers de zoom/rango Recharts. |
| `friendlyErrors.js` | `getFriendlyError` | Mapeo error técnico → mensaje amigable + sugerencias. |
| `AnalisisCircuitos.jsx` | Simulador de circuitos con Gauss. |
| `StructuralAnalysis.jsx` | Análisis estructural con Secante. |
| `TrafficLights.jsx` | Newton-Raphson para tránsito. |
| `CoolingHardware.jsx` | Bisección + Euler para CPU. |

---

## 8. Constantes (`src/constants/`)

- `data.js` — Catálogo principal:
  - `ROOT_METHODS` — 5 métodos de raíces (`{ id, name, type, ... }`).
  - `LINEAR_METHODS` — 5 métodos de sistemas lineales.
  - `METHODS` — Combinación de los dos anteriores (lo que usa el Solver).
  - `METHODS_DETAILS` — Detalle largo (descripción, fórmula, etc.).
  - `HOME_CARDS`, `AMN_CARDS` — Cards de Home y Aplicaciones.
- `methodDocs.js` — `METHOD_DOCUMENTATION[id]` con `{ desc, pros, cons, complexity, convergence, bestFor, avoidFor }` para tooltips.

---

## 9. Backend Express (`api/index.js`)

| Método | Endpoint | Auth | Función |
|---|---|:---:|---|
| GET | `/` | ❌ | Health check |
| POST | `/api/auth/register` | ❌ | Registro (PostgreSQL `23505` o SQLite `UNIQUE` → 400 "email registrado") |
| POST | `/api/auth/login` | ❌ | Login con bcrypt |
| GET | `/api/auth/me` | ✅ | Valida JWT, devuelve usuario |
| GET | `/api/ai/status` | ❌ | **NUEVO** Modelo Gemini + rate limit restante por IP |
| POST | `/api/ai/explain` | ❌ | Explicación pedagógica de un cálculo de raíz |
| GET | `/api/ai/chat/history` | ✅ | Trae últimos 50 mensajes del user en `ika_chats` |
| POST | `/api/ai/chat` | ✅ | Mensaje a IKA con historial y contexto de página |

Middlewares: `cors`, `helmet`, `express.json()`. Rate limiter en memoria (10 req/min por IP) compartido entre `/explain` y `/chat`.

---

## 10. Backend Python (`backend/numerika_math_engine.py`)

FastAPI + SymPy. Cache SQLite local (`ode_req.json`). CORS abierto a `localhost:5173`.

| Método | Endpoint | Body | Devuelve |
|---|---|---|---|
| GET | `/health` | — | `{ status, service }` |
| POST | `/api/math/derive` | `{ expression, variable }` | `{ plain, latex, cached }` |
| POST | `/api/math/integrate` | `{ expression, variable, lower?, upper? }` | idem (+ definida si hay límites) |
| POST | `/api/math/simplify` | `{ expression, variable }` | idem |
| POST | `/api/math/factorize` | `{ expression, variable }` | idem |
| POST | `/api/math/solve` | `{ equation, variable }` | `{ solutions: [{plain,latex}], count }` |
| POST | `/api/math/validate` | `{ expression }` | `{ valid, error? }` |
| POST | `/api/math/ode/solve` | `{ equation, ics: [{d, at, v}], variable, dependent }` | `{ solutions, steps, classification }` |
| POST | `/api/math/ode/system` | `{ equations, ics: {x:{at,v}, …} }` | `{ solutions: {x:…, y:…}, steps }` |

> **No corre en producción** (Vercel). Variable `VITE_MATH_ENGINE_URL` en el frontend define dónde está; si la respuesta falla, la UI muestra "motor no disponible".

---

## 11. Persistencia (`src/config/db.js`)

Auto-detecta:
1. Si `DATABASE_URL` está definida → intenta PostgreSQL (`pg`).
2. Si falla o no existe → cae a SQLite (`better-sqlite3`, archivo `numerika_local.db`).

Tablas creadas en el primer arranque (si SQLite):

```sql
users (id, first_name, last_name, email UNIQUE, password_hash, institution, role, created_at)
ika_chats (id, user_id FK, role, content, created_at)
```

El adapter de SQLite convierte placeholders `$1, $2, …` (estilo PG) a `?` y maneja `RETURNING` con `lastInsertRowid`.

---

## 12. Servicio de IA (`src/services/ai.js`)

```js
GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash"
```

- **`generateExplanation(data, retries=2)`** — Explica un cálculo de raíz al estudiante (3-5 oraciones, sin markdown). Retry con backoff si 429.
- **`chatWithIka(message, context, history)`** — Chat con `systemInstruction` que inyecta el `context` (qué está viendo el usuario).
- **`checkRateLimit(ip)`** — Incrementa contador. 10 req/min por IP.
- **`getRateLimitStatus(ip)`** — Inspecciona sin incrementar; devuelve `{ max, windowMs, used, remaining, resetInMs }`.

---

## 13. Hook `useMathEngine` (`src/hooks/useMathEngine.js`)

Wrapper REST + cache + estado de loading/error:

```js
const {
  derive, integrate, simplify, factorize, solve, validate,
  odeSolve, odeSystem,         // EDO simbólicas
  checkHealth,                 // ping al motor
  loading, error, clearError,
  addHistory,                  // historial local
} = useMathEngine();
```

Base URL: `import.meta.env.VITE_MATH_ENGINE_URL` (default `http://localhost:8000`).

---

## 14. Catálogo de métodos numéricos

### Raíces de f(x) = 0 (client-side, `numericalMethods.js`)
| ID | Nombre | Tipo | Entrada |
|---|---|---|---|
| `biseccion` | Bisección | cerrado | `[a, b]` |
| `reglafalsa` | Regla Falsa | cerrado | `[a, b]` |
| `newton` | Newton-Raphson | abierto | `x₀` |
| `secante` | Secante | abierto | `x₀, x₁` |
| `puntofijo` | Punto Fijo | abierto | `x₀` + `g(x)` |

### Sistemas lineales Ax=b (client-side, `linearSystems.js`)
| ID | Nombre | Tipo | Notas |
|---|---|---|---|
| `gauss` | Eliminación de Gauss | lineal-directo | Pivoteo parcial, devuelve `steps` |
| `gaussjordan` | Gauss-Jordan | lineal-directo | RREF, devuelve `steps` |
| `cramer` | Regla de Cramer | lineal-directo | Devuelve cada determinante |
| `jacobi` | Jacobi | lineal-iterativo | Necesita vector inicial + tolerancia |
| `gaussseidel` | Gauss-Seidel | lineal-iterativo | Convergencia más rápida que Jacobi |

### EDOs
**Simbólicas (Python/SymPy)** — `dsolve`:
- Orden superior con C.I. (`EDOOrdenSuperior`).
- Sistemas con C.I. en `t=0` (`SistemaEDO`).

**Numéricas (client-side)** — `numericalMethods.js`:
- `edoEuler(rhs, t0, y0, h, tFinal)` — orden O(h).
- `edoRK4(rhs, t0, y0, h, tFinal)` — orden O(h⁴).

### Integración numérica (client-side, `numericalMethods.js`)
| ID | Nombre | Restricción de n | Orden |
|---|---|---|---|
| `trapecio` | Trapecio compuesto | n ≥ 1 | O(h²) |
| `simpson13` | Simpson 1/3 | n par | O(h⁴) |
| `simpson38` | Simpson 3/8 | n múltiplo de 3 | O(h⁴) |

---

## 15. Data flows críticos

### 15.1 Cálculo de raíz (sin servidor)

```
SolverPage → numericalMethods.biseccion(...)   // client-side
          → result: { iterations, root, converged }
          → InteractiveChart + IterationTable
          → updateContext(...) → IKA ve qué pasó
```

### 15.2 Calculadora simbólica (con motor Python)

```
CalculadoraPage (operation=derive)
  → useMathEngine.derive(expr, var)
  → fetch POST http://localhost:8000/api/math/derive
  → motor Python → SymPy.diff() → { plain, latex, cached }
  → MathResult (KaTeX render)
```

### 15.3 Mensaje a IKA

```
IkaWidget.handleSend()
  → POST /api/ai/chat   { message, context: page+details }
  → Express valida JWT, checkRateLimit(ip), guarda mensaje en ika_chats
  → trae history últimos 60
  → chatWithIka(msg, ctx, history) → Gemini 2.5 Flash
  → guarda respuesta en ika_chats
  → IkaWidget pinta burbuja
  → refreshStatus() → actualiza chips remaining
```

---

## 16. Variables de entorno

| Var | Scope | Obligatoria | Default | Notas |
|---|---|:---:|---|---|
| `PORT` | server | no | `3000` | |
| `NODE_ENV` | server | no | — | Si `production`, Express no llama a `listen` (Vercel serverless) |
| `DATABASE_URL` | server | no | — | Si no se setea, usa SQLite local |
| `JWT_SECRET` | server | sí | — | ≥ 32 chars random |
| `GEMINI_API_KEY` | server | sí (para IKA) | — | De Google AI Studio |
| `GEMINI_MODEL` | server | no | `gemini-2.5-flash` | Cualquier modelo de los 34 que devuelve `list-gemini-models.mjs` |
| `VITE_API_URL` | client | sí | — | URL del Express (`http://localhost:3000`) |
| `VITE_MATH_ENGINE_URL` | client | no | `http://localhost:8000` | **No definir en prod** (Vercel) |

---

## 17. Scripts npm

| Comando | Qué hace |
|---|---|
| `npm run dev` | Solo Vite (`:5173`) |
| `npm start` | Solo Express (`node api/index.js`) |
| `npm run start:local` | Los **3 servicios** con logs coloreados (vía `start-local.js`) |
| `npm run build` | Build de producción de Vite |
| `npm run preview` | Servir el build |
| `npm run lint` | ESLint (no hay Prettier ni typecheck) |

### Scripts auxiliares (no en `package.json`)
- `node scripts/test-gemini.mjs [modelo]` — Smoke test de la API key contra un modelo Gemini.
- `node scripts/list-gemini-models.mjs` — Lista los 34 modelos disponibles para la key actual.
- `node scripts/test-ika-flow.mjs` — E2E: register → chat → respuesta.

---

## 18. Estilos (`src/styles/`)

Una hoja por feature, todos importados en `App.jsx`:

| Archivo | Cubre |
|---|---|
| `globals.css` | Variables CSS (`--teal`, `--cream`, `--dark`, …), reset, tipografía |
| `nav.css` | Barra superior |
| `home.css` | Landing |
| `cards.css` | Cards genéricas |
| `buttons.css` | `.btn-cta`, `.btn-run`, `.btn-secondary` |
| `solver.css` | Solver + sistemas lineales (`.linsys-*`) |
| `comparison.css` | Comparador (barchart + tabla) |
| `calculadora.css` | Calculadora + EDO + **integración numérica (`.intnum-*`)** |
| `plot3d.css` | Modal 3D + trigger + Plotly skin |
| `ika.css` | Widget IKA (chips meta, burbujas con KaTeX scroll, etc.) |
| `auth.css` | Login/register |
| `simulators.css` | Simuladores de Aplicaciones |
| `friendly-errors.css` | `FriendlyErrorBox` |
| `footer.css` | Footer |

**Convención**: ningún componente importa CSS directo; todo se carga en `App.jsx`.

---

## 19. Convenciones del proyecto

- **Naming**: PascalCase para componentes `.jsx`, camelCase para utilidades `.js`, kebab-case para CSS, snake_case para Python.
- **Sin TypeScript**, sin Prettier, ESLint solo con `no-unused-vars: warn`, `no-console: off`.
- **Sin tests**: la verificación es `npm run build` + smoke tests manuales en navegador + scripts en `scripts/`.
- **EDOs**: el frontend tolera respuestas en formato viejo (string) o nuevo (`{plain, latex}`) — ver `EDOMathParts.resolveMathValue`.
- **3D**: Plotly.js se carga **lazy desde CDN** en `loadPlotly()`, no bundlea con Vite. El modal se monta vía `createPortal(document.body)` para evitar problemas de stacking/`transform`.
- **IKA contexto**: `IkaRouteWatcher` setea un contexto base por ruta automáticamente; las páginas con info específica (Solver, Comparador, Calculadora) lo sobreescriben con detalle.

---

## 20. Despliegue (Vercel)

`vercel.json` redirige todo `/api/*` a `api/index.js` (Express en modo serverless) y todo lo demás a `index.html` (SPA).

### Variables que SÍ van en Vercel
- `JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`, `VITE_API_URL`.

### Variables que NO van en Vercel
- `VITE_MATH_ENGINE_URL` — el motor Python no corre en prod; dejarla **sin definir** hace que la calculadora muestre "motor desconectado" en vez de romperse.

> Si querés sí o sí motor simbólico en prod, hay que hostear el `backend/` aparte (Render, Railway, contenedor) y apuntar `VITE_MATH_ENGINE_URL` a esa URL.

---

## 21. Atajos para agentes / nuevos devs

| Quiero… | Voy a… |
|---|---|
| Agregar un método de raíz | `numericalMethods.js` (función) → `constants/data.js:ROOT_METHODS` → `methodDocs.js` |
| Agregar un método lineal | `linearSystems.js` (función) → `solveLinearSystem` (switch) → `constants/data.js:LINEAR_METHODS` |
| Agregar una operación en Calculadora | `MathComponents.OperationSelector` → `useMathEngine` (si necesita Python) → `CalculadoraPage.handleCalculate` |
| Cambiar lo que ve IKA en una página | Usar `useIka().updateContext(page, details)` en la página o ajustar el patrón en `IkaRouteWatcher.ROUTE_CONTEXTS` |
| Cambiar el modelo Gemini | `.env` → `GEMINI_MODEL=gemini-3.5-flash` (o cualquiera de los 34 disponibles) |
| Diagnosticar IKA | `node scripts/test-ika-flow.mjs` mientras el API corre |

---

> **Última verificación**: 19-may-2026 · build de producción OK · IKA respondiendo con `gemini-2.5-flash` · todos los servicios levantando con `npm run start:local`.
