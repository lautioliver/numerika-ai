# 📘 Guía de Presentación — NumérikaAI

> Guía pensada para mostrar todas las funcionalidades del proyecto durante la presentación con los profesores. **Todo corre en local.** Versión: 19-may-2026.

---

## ⚙️ Setup rápido (antes de la presentación)

```bash
# Una sola línea: levanta los 3 servicios con logs coloreados
npm run start:local
```

Eso arranca:
- Vite Frontend (`http://localhost:5173`) — color magenta
- Express API (`http://localhost:3000`) — color cyan
- Motor matemático Python (`http://localhost:8000`) — color amarillo

> Si preferís levantar a mano, ver [`LOCAL_SETUP.md`](../LOCAL_SETUP.md).

### Variables de entorno mínimas (`.env` en la raíz)

```env
JWT_SECRET=<random largo>
GEMINI_API_KEY=<tu key de Google AI Studio>
VITE_API_URL=http://localhost:3000
VITE_MATH_ENGINE_URL=http://localhost:8000
```

> Sin `DATABASE_URL` el sistema usa SQLite local (`numerika_local.db`) — se crea solo al primer arranque.

### Smoke test rápido (antes de mostrar nada)

```bash
node scripts/test-ika-flow.mjs    # ✅ register → IKA responde
```

---

## 🌟 Funcionalidades a mostrar

### 1. Registro y autenticación

Sistema de usuarios completo con **JWT + bcrypt**.

**Demo:**
1. Ir a `/register`, crear cuenta (ej. `estudiante@demo.com`).
2. El sistema saluda por nombre.
3. Cerrar sesión y volver a iniciar — la sesión persiste (token en `localStorage` + validación contra `/api/auth/me`).
4. La BD local guarda los usuarios en `users` y los chats con IKA en `ika_chats` (SQLite o PostgreSQL si está configurado).

**Valor educativo:** preparado para que cada alumno guarde su historial de cálculos y conversación con IKA.

---

### 2. Solver Numérico — Raíces de f(x) = 0

`/solver/:metodo` — Motor 100% client-side con `math.js`. **No** requiere backend.

**Métodos:** Bisección, Regla Falsa, Newton-Raphson, Secante, Punto Fijo.

**Demo:**
1. Tab **Bisección**. Función: `x^2 - x - 2`, intervalo `[1, 3]`, tolerancia `0.0001`.
2. Presionar **Calcular**.
3. Mostrar:
   - Tabla iterativa paso a paso con errores relativos.
   - Gráfico interactivo con zoom (+ / − / reset).
   - Línea vertical en la raíz y label "x = 2.0000".
   - Detección automática de raíces múltiples en el dominio.
   - Análisis de convergencia que explica por qué convergió.
   - Click en una fila de la tabla → flecha naranja en el gráfico.
4. **Error amigable**: probar `[3, 5]` (sin cambio de signo) → mensaje explicativo con sugerencia, **no crashea**.
5. **Ejemplos precargados** en la sección de configuración.

**Valor educativo:** el estudiante ve *cómo* se llega al resultado, iteración por iteración.

---

### 3. Solver de Sistemas Lineales — Ax = b 🆕

Mismo URL `/solver/:metodo` pero en el segundo grupo de tabs **"Sistemas lineales Ax = b"**.

**Métodos:**

| Método | Tipo | Cuándo usarlo |
|---|---|---|
| Eliminación de Gauss | directo | Caso general estable |
| Gauss-Jordan | directo | Cuando se quiere la inversa o RREF |
| Regla de Cramer | directo | Sistemas chicos con `det(A) ≠ 0` |
| Jacobi | iterativo | Diagonalmente dominantes, paralelizable |
| Gauss-Seidel | iterativo | Mejor convergencia que Jacobi |

**Demo:**
1. Tab **Eliminación de Gauss**.
2. Cargar ejemplo "3x3 simple": muestra matriz aumentada editable.
3. Calcular → resultado:
   - Vector solución `(x₁, x₂, x₃)`.
   - Tabla **paso a paso** con el pivoteo parcial y cada eliminación.
4. Cambiar a tab **Jacobi** → cargar el mismo sistema → muestra **tabla de iteraciones** con el error en cada paso. Si la matriz no es diagonalmente dominante, aparece un warning explicando el riesgo de divergencia.

**Valor educativo:** comparación directa de métodos directos vs iterativos sobre el mismo sistema.

---

### 4. Calculadora Simbólica + EDOs

`/calculadora` — Opera con el **motor Python** (SymPy) en `:8000`.

**7 modos:** Derivar, Integrar (simbólico), Simplificar, Factorizar, Resolver ecuación, EDO, Integración numérica.

#### Demo Derivar/Integrar:
1. Tab **Derivar**, expresión `x^3 - 2*x + 1`, variable `x` → resultado en LaTeX renderizado con KaTeX.
2. Tab **Integrar**, expresión `sin(x)` con límites `[0, pi]` → muestra `2`.

#### Demo EDOs (lo más vistoso):
1. Tab **EDO** → sub-tab **Orden Superior**.
2. Cargar ejemplo "Armónico simple": `y'' + y = 0` con C.I. `y(0) = 1`, `y'(0) = 0`.
3. **Calcular** → muestra:
   - Solución general y particular en **LaTeX**.
   - Clasificación de la EDO.
   - Desplegable **"Procedimiento"** con pasos titulados.
4. Sub-tab **Sistema** → ejemplo "Armónico (x,y)": `x' = y`, `y' = -x`.
5. Sub-tab **Numérico (Euler / RK4)**:
   - Cargar ejemplo de decaimiento `y' = -y`.
   - **Calcular** → tabla de iteraciones + gráfico 2D + botón **"Ver en 3D"** que abre un modal de **trayectoria interactiva 3D** (Plotly.js) con scrubber temporal.

#### Demo Integración Numérica 🆕:
1. Tab **Integración**.
2. Cargar ejemplo `∫₀¹ x² dx = 1/3`.
3. Probar el mismo intervalo con los 3 métodos:
   - **Trapecio** con `n=8` → I ≈ 0.335938 (error ≈ 0.7%).
   - **Simpson 1/3** con `n=8` → I ≈ 0.333333 (exacto a 6 dígitos).
   - **Simpson 3/8** con `n=6` → I ≈ 0.333333.
4. Mostrar:
   - Tarjetas resumen (f, intervalo, n·h, I).
   - Fórmula del método.
   - Gráfico con el área sombreada bajo la curva.
   - Tabla de paneles con los `f(xᵢ)` y la contribución de cada uno.

**Si el motor Python no está corriendo:** los modos simbólicos (Derivar/Integrar/EDO simbólico) muestran "Motor desconectado" — pero **Euler/RK4 e Integración Numérica siguen funcionando** porque corren client-side.

---

### 5. Comparador de Métodos

`/comparar` — Corre los 5 métodos de raíces simultáneamente sobre la misma función.

**Demo:**
1. Función `x^2 - 4`, intervalo `[1, 3]`.
2. Resultado:
   - Tabla con iteraciones, raíz, error final, tiempo (ms), estado por método.
   - **Gráfico de barras** de tiempo de ejecución.
   - **Gráfico de barras** de iteraciones.
   - Colores únicos por método.

---

### 6. Aplicaciones Prácticas de Ingeniería

`/aplicaciones` — Simuladores que usan métodos numéricos en contextos reales.

| Aplicación | Método | Descripción |
|---|---|---|
| **Riesgo Urbano** (semáforos) | Newton-Raphson | Densidad óptima de infraestructura vial |
| **Análisis de Viga** | Secante | Posición donde una viga alcanza una deflexión objetivo |
| **Análisis de Circuitos** | Eliminación de Gauss | Corrientes de malla en circuito 3×3 |
| **Enfriamiento de Hardware** | Bisección + Euler | Temperatura de equilibrio CPU + transitorio térmico |

**Demo rápida:** abrir **Análisis de Circuitos** → al cambiar las resistencias o el voltaje, las corrientes `I₁`, `I₂`, `I₃` se recalculan en vivo usando Gauss interno (de `linearSystems.js`).

---

### 7. IKA — Asistente con IA 🤖

Widget flotante (abajo a la derecha) impulsado por **Gemini 2.5 Flash** (de `@google/generative-ai`).

**Lo nuevo (19-may):**
- ✅ **Contextual real**: IKA "ve" en qué página estás — cuando navegás, su contexto se actualiza solo (`IkaRouteWatcher`).
- ✅ **Burbujas que no se rompen**: las fórmulas LaTeX anchas hacen scroll horizontal dentro de la burbuja.
- ✅ **Chips de estado**: en el header se muestran el modelo en uso (`gemini-2.5-flash`) y la cuota restante por minuto (`8/10 ·/min`), con color teal → amarillo → rojo.
- ✅ **Widget más grande**: 440×640px.

**Demo:**
1. Después de registrarte y loguearte, abrir IKA (FAB abajo a la derecha).
2. Hacer un cálculo en `/solver/biseccion` y preguntarle *"¿Por qué convergió este método?"*.
3. IKA responde con el contexto **exacto** de lo que se está viendo (función, intervalo, raíz hallada).
4. Cambiar a `/calculadora` → el badge "👀 Viendo: …" cambia solo. Preguntarle *"¿Qué pasos sigue el método de Simpson 1/3?"*.
5. Mostrar el chip de cuota: bajar de `10/10` a `9/10`, luego a `8/10`, etc., con cada mensaje.
6. Pedirle a IKA *"Mostrame la fórmula de Newton-Raphson en LaTeX"* → la fórmula renderiza con KaTeX dentro de la burbuja, con scroll horizontal si es muy larga.

**Valor educativo:** tutor disponible 24/7 que entiende el problema *actual* del alumno.

---

## 8. Arquitectura general

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│ Vite (5173)   │────▶│ Express (3000)│────▶│ Python Engine (8000) │
│ React 19 SPA  │     │ API + Auth   │     │ SymPy / FastAPI      │
│ math.js       │     │ JWT bcrypt   │     │ derivar, integrar,   │
│ Recharts      │     │ SQLite/PSQL  │     │ EDOs, solver alg.    │
│ Plotly (CDN)  │     │ Gemini 2.5   │     │                      │
│ KaTeX         │     │              │     │                      │
└──────────────┘     └──────────────┘     └──────────────────────┘
```

- **Solver de raíces y sistemas lineales**: no toca backend (100% client-side).
- **Integración numérica (Trapecio/Simpson)**: 100% client-side.
- **Euler/RK4**: 100% client-side.
- **Calculadora simbólica + EDOs simbólicas**: requiere Python corriendo.
- **Auth + IKA**: requiere Express + `GEMINI_API_KEY`.

> **Lectura recomendada antes del demo:** [`docs/CODEMAP.md`](./CODEMAP.md) para tener el mapa completo a mano.

---

## 9. Tips para la presentación

- Mostrar los 3 servicios arrancando con `npm run start:local` (logs coloreados por servicio).
- Provocar un error a propósito (intervalo sin cambio de signo, `1/0`, sintaxis rara) para mostrar el **manejo amigable** de errores.
- Mostrar la **respuesta de IKA usando LaTeX** para demostrar el render con KaTeX.
- Si el motor Python no arranca, enfocarse en **Solver + Sistemas Lineales + Integración Numérica + Euler/RK4 + IKA** (todo eso anda igual).
- Si Gemini queda sin cuota durante la demo, mostrar el endpoint `/api/ai/status` y los scripts `scripts/test-gemini.mjs` y `scripts/list-gemini-models.mjs` que diagnostican y permiten cambiar de modelo modificando `GEMINI_MODEL` en `.env`.

---

## 10. Limitaciones conocidas para mencionar en preguntas

- El motor simbólico Python **no corre en producción** (Vercel). Para Demo Day se asume entorno local.
- La cuota gratuita de Gemini es por proyecto y se resetea diariamente. El widget muestra cuánto queda.
- El bundle pesa ~2.4 MB (gzip ~650 KB). Para producción se puede dividir con `manualChunks` si interesa.

---

## 11. Referencias rápidas

- **CodeMap** → [`docs/CODEMAP.md`](./CODEMAP.md)
- **Bitácora de cambios** → [`docs/TEAM_UPDATE.md`](./TEAM_UPDATE.md)
- **Setup local detallado** → [`LOCAL_SETUP.md`](../LOCAL_SETUP.md)
- **Estado de features** → [`FEATURES.md`](../FEATURES.md)
- **Notas para agentes IA** → [`AGENTS.md`](../AGENTS.md)
