# AGENTS.md — NumérikaAI

## Quick start

```bash
npm install              # root: installs all JS deps
cd backend
python -m venv venv      # once: Python math engine deps
.\venv\Scripts\activate; pip install -r requirements.txt
docker compose up -d     # postgres + redis (optional for full auth)
```

**Run everything (3 services):**
```bash
npm run start:local      # Vite (5173) + Express (3000) + Math Engine (8000)
```

## Services

| Service | Port | Start command | Directory |
|---------|------|---------------|-----------|
| Vite dev server | 5173 | `npm run dev` | root |
| Express API | 3000 | `npm start` | `api/index.js` |
| Math engine (Python) | 8000 | `cd backend; .\venv\Scripts\activate; python numerika_math_engine.py` | `backend/` |
| PostgreSQL | 5432 | `docker compose up -d` | — |
| Redis | 6379 | `docker compose up -d` | — |

## Commands

| Command | What |
|---------|------|
| `npm run dev` | Vite dev server only |
| `npm start` | Express API only (`node api/index.js`) |
| `npm run start:local` | All 3 services (uses `start-local.js`, colored logs) |
| `npm run build` | Vite production build |
| `npm run lint` | ESLint (no Prettier, no typecheck) |
| `npm run preview` | Preview Vite build |

## Architecture facts

- **Monorepo, 3 independent services**: frontend (React), API (Express), math engine (Python/FastAPI).
- Express API lives in `api/index.js` for Vercel serverless. Previously `server.js` — use `api/index.js`.
- **DB auto-fallback**: `src/config/db.js` tries PostgreSQL (`DATABASE_URL`), falls back to SQLite (`numerika_local.db`). Creates `users` and `ika_chats` tables on SQLite init. SQLite adapter converts `$N` → `?` and handles `RETURNING` clause.
- **AI uses Gemini** (`@google/generative-ai`, model `gemini-2.0-flash`), **not OpenAI**. The env var is `GEMINI_API_KEY` (⚠️ `.env.example` incorrectly says `OPENAI_API_KEY`). Rate limit: 10 req/min per IP in memory.
- Math engine is Python/FastAPI + SymPy in `backend/numerika_math_engine.py`.
- Math engine can run standalone via Docker (`docker compose up -d`) or locally with venv (`start-math-engine.bat` on Windows).
- Vercel deploy: rewrites `/api/*` → `api/index.js`, everything else → `index.html`.
- Numerical solver runs **client-side** via `math.js` in `src/utils/numericalMethods.js`. No server needed for core solver.
- Auth: JWT (7d expiry) + bcrypt. Token validated on app load via `/api/auth/me`.

### Math engine endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| POST | `/api/math/derive` | Derivada |
| POST | `/api/math/integrate` | Integral |
| POST | `/api/math/simplify` | Simplificación |
| POST | `/api/math/factorize` | Factorización |
| POST | `/api/math/solve` | Ecuación algebraica |
| POST | `/api/math/validate` | Validar sintaxis |
| POST | `/api/math/ode/solve` | EDO orden superior + C.I. |
| POST | `/api/math/ode/system` | Sistema de EDOs + C.I. |

Base URL (frontend): `VITE_MATH_ENGINE_URL` or `http://localhost:8000` via `useMathEngine`.

### Calculadora — modo EDO

- **Page**: `src/pages/CalculadoraPage.jsx` — tab `edo` en `OperationSelector` (`includeEdo`).
- **Components**:
  - `src/components/HigherOrderStates.jsx` — `EDOOrdenSuperior`
  - `src/components/EDOSystem.jsx` — `SistemaEDO`
  - `src/components/EDOMathParts.jsx` — `EDOMathExpr`, `EDOStepList` (KaTeX)
  - `src/components/EdoNumerico.jsx` — Euler / RK4 (client-side, sin motor Python)
- **Hook**: `useMathEngine()` expone `odeSolve`, `odeSystem`, `checkHealth`, etc. Euler/RK4 usan `edoEuler` / `edoRK4` en `numericalMethods.js`.
- **Respuesta EDO**: soluciones como `{ plain, latex }`; pasos como `[{ label, latex?, text? }]`. El frontend usa `MathRenderer` (KaTeX), no strings crudos de SymPy.
- **Estilos EDO**: `src/styles/calculadora.css` (bloque `.edo-section`, `.edo-step-*`).

## Testing

No test framework configured. No tests exist. Run `npm run lint` to verify code. Para EDO local: motor en `:8000` + `npm run dev` → Calculadora → EDO.

## Important quirks

- `.env.example` references `OPENAI_API_KEY` but the actual code uses `GEMINI_API_KEY`. When setting up, use `GEMINI_API_KEY`.
- README mentions OpenAI, code uses Gemini — trust the code.
- ESLint only (no Prettier, no typechecker). Unused vars = `warn`, console = `off`.
- Math engine cache (SQLite) puede devolver respuestas EDO en formato antiguo (strings); el frontend tolera ambos formatos en `EDOMathParts.resolveMathValue`.
- `docs/TEAM_UPDATE.md` puede estar desactualizado respecto al backend Python: el motor simbólico **sí** vive en `backend/` (SymPy).

#### Generado por OpenCode.
