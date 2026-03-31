# 🗺️ Roadmap Técnico y Arquitectura de Numérika-AI

Esta documentación es un mapa completo del código fuente de Numérika-AI. Sirve como guía de referencia rápida para entender cómo están conectadas todas las piezas de la plataforma, dónde va cada cosa, y hacia dónde se dirige el desarrollo a futuro.

---

## 🏗️ 1. Arquitectura General

El proyecto funciona con una arquitectura cliente-servidor tradicional acoplada a un motor de inteligencia artificial:
- **Frontend (Cliente):** React 19 + Vite + React Router v7. Renderiza la UI y mantiene el estado global del usuario (Auth) y su navegación actual (IkaContext).
- **Backend (Servidor):** Node.js + Express. Gestiona autenticación, Rate Limiting, protege las llaves de acceso secretas y sirve como proxy para la IA.
- **Microservicio AI:** Google Gemini (vía `gemini-2.0-flash-lite`). Procesa operaciones matemáticas y responde como "IKA".
- **Base de Datos:** PostgreSQL (alojado en Railway). Consolidando autenticación de usuarios y persistencia de memoria/historial de los chats IA.

---

## 📂 2. Árbol y Mapeo de Directorios

El código está estructurado bajo la carpeta `/src` y la raíz del proyecto.

```text
numerika-ai/
├── server.js                      # Código fuente del Servidor バックエンド (API, Middlewares, Auth DB).
├── .env.example                   # Platilla segura para configurar variables de entorno.
└── src/                           # Código fuente del Frontend React (Cliente)
    ├── main.jsx                   # Raíz de la App, inyecta React Router y Proveedores de Contexto.
    ├── App.jsx                    # Routing principal (Define todas las rutas URL).
    │
    ├── components/                # 🧩 Componentes Modulares de UI
    │   ├── IkaWidget.jsx          # Componente flotante de la IA (Lógica, UI, Parseo Markdown).
    │   ├── Navigation.jsx         # Barra de navegación (Header interactivo).
    │   ├── Card.jsx / MethodTypeTag.jsx # Elementos UI para listar los métodos numéricos.
    │
    ├── pages/                     # 🚀 Vistas Completas de Pantallas
    │   ├── HomePage.jsx           # Landing page o inicio del sistema.
    │   ├── SolverPage.jsx         # Motor dinámico de cálculos - Pantalla principal donde se corre Bisección, Newton, etc.
    │   ├── ComparisonPage.jsx     # Permite comparar 4 métodos a la vez usando recharts y IA.
    │   ├── Amn.jsx                # Renderizador de "Aplicaciones de Métodos Numéricos".
    │   ├── MethodsPage.jsx        # Lista catálogo con todos los métodos numéricos.
    │   └── LoginPage / Register   # Pantallas de Auth.
    │
    ├── context/                   # 🧠 Estados Globales (React Context API)
    │   ├── AuthContext.jsx        # Verifica y valida tokens JWT globalmente.
    │   └── IkaContext.jsx         # Contexto IA: Espía en qué pantalla/estado está el usuario para darle contexto a Gemini.
    │
    ├── utils/                     # ⚙️ Motores Matemáticos de Ejecución
    │   ├── numericalMethods.js    # 👑 NÚCLEO MATEMÁTICO: Lógica pura de Newton, Secante, Bisección, y derivadas (Math.js).
    │   ├── aplicationNumerical... # Simulador interactivo #1 (Multas Tránsito / Riesgo Urbano).
    │   └── StructuralAnalysis.jsx # Simulador interactivo #2 (Deflexión en Estructuras / Ing. Civil).
    │
    ├── services/                  # 🔌 Consumo de APIs Externas
    │   └── ai.js                  # Lógica del cliente Gemini, inyección de roles (SystemInstruction), retry-loops y rate-limits.
    │
    ├── constants/                 # 📂 Variables y Configuración Constante
    │   └── data.js                # Base de datos estática: Textos guiados de métodos, descripciones y mapeos visuales.
    │
    └── styles/                    # 💅 Sistema de Diseño (CSS Vanilla)
        ├── globals.css            # Tipografías y reset de animaciones.
        └── (nav, ika, auth, ...).css # CSS puramente modularizado para cada componente principal.
```

---

## 🔄 3. Flujos de Datos Core (Cómo se Ejecuta la App)

### Flujo Analítico A: Calcular un Método (Solver)
1. El usuario entra a `SolverPage`. Éste componente espía los inputs (ecuación `f(x)`, a, b).
2. Al presionar *Calcular*, `SolverPage` llama internamente a las funciones puras en `numericalMethods.js`.
3. `numericalMethods.js` pre-procesa la sintaxis (Math.js), evalúa iteraciones, y devuelve un objeto de resultado `{ root, convergencia, historial_puntos }`.
4. El Frontend renderiza un gráfico (via `recharts`) mostrando los puntos y luego hace un Fetch al *Backend* mediante el servicio AI apuntando a `/api/ai/explain`.
5. El sistema de IA retorna una narrativa educativa evaluando el porqué el método convergió (o fracasó).

### Flujo Analítico B: IKA, el Asistente en Tiempo Real
1. El usuario navega por las vistas. Cualquier vista envuelta en `App.jsx` inyecta un estado hacia `IkaContext`.
2. El usuario abre el widget `IkaWidget` y escribe un mensaje.
3. El frontend compila: [El input del usuario] + [El historial de la DB enviado desde server.js] + [La instrucción dinámica generada del IkaContext para que IKA sepa qué está viendo el usuario en la UI en ese milisegundo].
4. Envía a Gemini vía endpoint, recibe el string y usa librerías `remark-math` y `rehype-katex` para que las fórmulas matemáticas y código en el chat se rendericen gloriosamente.

---

## 🌟 4. Próximos Pasos (Roadmap Extendido a Futuro)

Este roadmap identifica qué se debe desarrollar de acá en más tras la base actual estabilizada.

#### Fase 1: Enfoque Inmediato y Contenido
- [ ] **Simulador de Termodinámica:** Agregar el tercer motor aplicado de la rama civil-calor en las aplicaciones prácticas (AMN), referenciado actualmente en el map de `Amn.jsx` (línea 10).
- [ ] **Despliegue a Producción Seguro (Deploy):** Definir valores estrictos reales de contraseñas (`.env` setup), `JWT_SECRET` hash largo para seguridad, y montar en un hosting Frontend como Vercel y un Backend en Railway/Render (actualizando el `VITE_API_URL`).

#### Fase 2: Robustez del Motor y Testing
- [ ] **Ampliar `numericalMethods.js`:** Brindar soporte estricto a métodos con matrices (Ej: Gauss-Jordan / Jacobi) y validaciones severas contra división-por-cero para evitar bloqueos del JavaScript Main-Thread en funciones trigonométricas hostiles.
- [ ] **Unit Tests (Pruebas Unitarias):** Implementar *Vitest/Jest* para validar si cada método matemático entrega resultados matemáticamente avalados en todo tipo de ecuaciones, sin tener que confirmarlo a ojo por el desarrollador.

#### Fase 3: Ecosistema y Escalabilidad de IA
- [ ] **AI Fallback & Cola de Mensajería:** Actualizar el limiter temporal del backend. Con más usuarios concurrentes a escala, la cuota Free-Tier de Gemini fallará; escalar a una API Key de paga con *VertexAI* y añadir WebSockets para streamear texto ("Escribiendo IA...") en tiempo real en la UI en lugar de congelar por "Loading" block síncrono.
- [ ] **Reconstrucción del sistema `/docs`:** Reactivar y finalizar el sistema de Documentación teórica.
