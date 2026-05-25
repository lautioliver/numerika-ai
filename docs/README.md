# 📚 Documentación — NumérikaAI

Bienvenido. Esta carpeta contiene la documentación viva del proyecto, pensada para el equipo y para profesores/jurado. Última actualización: **19-may-2026**.

---

## 📑 Índice

| Documento | Para quién | Qué encontrás |
|---|---|---|
| **[CODEMAP.md](./CODEMAP.md)** 🆕 | Devs · Agentes IA · Onboarding | Mapa completo del código: arquitectura, rutas, endpoints, módulos, data flows, convenciones, atajos. **Empezar acá.** |
| **[TEAM_UPDATE.md](./TEAM_UPDATE.md)** | Equipo | Bitácora cronológica de cambios por sesión (qué se agregó, por qué y qué archivos toca). |
| **[PROFESSOR_GUIDE.md](./PROFESSOR_GUIDE.md)** | Profesores · Demo Day | Guión de presentación con los pasos exactos para mostrar cada funcionalidad. |

---

## 🧭 Otros archivos importantes (fuera de `docs/`)

| Archivo | Para qué |
|---|---|
| [`../README.md`](../README.md) | Overview público del repo (badges, features, stack). |
| [`../LOCAL_SETUP.md`](../LOCAL_SETUP.md) | Guía detallada de levantar los 3 servicios paso a paso. |
| [`../FEATURES.md`](../FEATURES.md) | Estado de features (5 ✅ realizadas + 1 ⚠️ pendiente). |
| [`../AGENTS.md`](../AGENTS.md) | Quick-start denso para agentes de IA. |
| [`../.env.example`](../.env.example) | Plantilla de variables de entorno. |

---

## 🎯 Por dónde empiezo según mi rol

### Soy un dev nuevo en el equipo
1. Leer [`CODEMAP.md`](./CODEMAP.md) (15 min).
2. Seguir [`../LOCAL_SETUP.md`](../LOCAL_SETUP.md) para levantar todo.
3. Mirar [`TEAM_UPDATE.md`](./TEAM_UPDATE.md) para saber qué se hizo en las últimas sesiones.

### Voy a presentar el proyecto
1. Leer [`PROFESSOR_GUIDE.md`](./PROFESSOR_GUIDE.md) (10 min).
2. Hacer un smoke test antes: `node scripts/test-ika-flow.mjs`.
3. Tener `npm run start:local` listo en una terminal con los logs visibles.

### Soy un agente de IA / quiero modificar el código
1. Leer [`../AGENTS.md`](../AGENTS.md) (3 min, denso).
2. Consultar [`CODEMAP.md` §21 "Atajos"](./CODEMAP.md#21-atajos-para-agentes--nuevos-devs) según qué quiera tocar.
3. Revisar [`../FEATURES.md`](../FEATURES.md) para no duplicar trabajo.

### Quiero saber qué cambió últimamente
→ [`TEAM_UPDATE.md`](./TEAM_UPDATE.md).

---

## 🛠️ Mantenimiento de esta documentación

- Cada vez que cerremos una sesión de trabajo grande, sumar una entrada **arriba** en `TEAM_UPDATE.md` (no editar las viejas).
- Si la arquitectura cambia (nuevo servicio, nuevo endpoint, nueva ruta del frontend) → actualizar `CODEMAP.md`.
- Si se agrega una feature visible al usuario → actualizar `PROFESSOR_GUIDE.md`.
- Si la forma de levantar el proyecto cambia → actualizar `LOCAL_SETUP.md` y la sección setup de `PROFESSOR_GUIDE.md`.

> Regla simple: **el CodeMap describe la realidad presente**, **TEAM_UPDATE narra el pasado**, **PROFESSOR_GUIDE prepara el futuro inmediato (la demo)**.
