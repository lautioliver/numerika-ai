# NumérikaAI — Guía de Ejecución Local

## 📋 Requisitos Previos

| Herramienta | Versión mínima | Verificar |
|-------------|---------------|-----------|
| **Node.js** | 18+ | `node --version` |
| **npm** | 9+ | `npm --version` |
| **Python** | 3.11+ | `python --version` |
| **Git** | 2.x | `git --version` |

> **IMPORTANTE:** Vas a necesitar 3 terminales abiertas simultáneamente (una para cada servicio).

---

## ⚡ Arranque rápido (1 comando)

Si ya tenés las dependencias instaladas (Node + venv de Python), podés levantar **los 3 servicios juntos** con:

```bash
npm run start:local
```

Esto usa `start-local.js`, que lanza con logs de colores:

- **API Express** → `http://localhost:3000`
- **Frontend Vite** → `http://localhost:5173`
- **Motor Matemático (Python)** → `http://localhost:8000`

`start-local.js` es **multiplataforma**: detecta el SO y arranca el motor Python usando el intérprete del venv (`backend/venv/bin/python` en Linux/macOS o `backend\venv\Scripts\python.exe` en Windows). Si el venv no existe, omite el motor con un aviso en vez de fallar.

---

## 🐧 Setup en Linux (primera vez)

En Linux Mint/Ubuntu, la instalación pensada para Windows no funciona directamente. Seguí estos pasos:

### 1. Dependencias de Node (limpias para Linux)

Si copiaste el proyecto desde Windows, `node_modules` trae binarios de Windows (esbuild, better-sqlite3) y Vite se cuelga sin mostrar la URL. Reinstalá limpio:

```bash
rm -rf node_modules package-lock.json
npm install
```

### 2. Entorno virtual de Python

Debian/Ubuntu suele venir sin `ensurepip`/`venv`. Dos opciones:

**Opción A — con permisos de administrador (recomendado):**
```bash
sudo apt install python3-venv python3-pip
python3 -m venv backend/venv
backend/venv/bin/pip install -r backend/requirements.txt
```

**Opción B — sin `sudo` (usando `virtualenv`):**
```bash
# Bootstrap de pip a nivel usuario
curl -sSL https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py
python3 /tmp/get-pip.py --user --break-system-packages

# virtualenv trae su propio pip (no depende de ensurepip)
python3 -m pip install --user --break-system-packages virtualenv
python3 -m virtualenv backend/venv
backend/venv/bin/pip install -r backend/requirements.txt
```

### 3. Levantar todo

```bash
npm run start:local
```

---

## 🎯 Minimum Requerido (2 servicios)

Con esto podés usar el Solver, la Calculadora y todas las herramientas matemáticas.

### Terminal 1: Frontend (React + Vite)

```bash
# Abrir TERMINAL 1
# Navegar a la carpeta del proyecto
cd numerika-ai

# Instalar dependencias (solo la primera vez)
npm install

# Copiar archivo de ejemplo de variables de entorno
cp .env.example .env
```

**Editar `.env` y reemplazar los valores:**
```env
VITE_API_URL=http://localhost:3000
```

```bash
# Iniciar el servidor de desarrollo
npm run dev
# Abrir en navegador: http://localhost:5173
```

---

### Terminal 2: Motor Matemático (Python + FastAPI)

```bash
# Abrir TERMINAL 2
cd numerika-ai/backend

# Crear entorno virtual (solo la primera vez)
python -m venv venv

# Activar entorno virtual:
#   → Windows (PowerShell):
.\venv\Scripts\activate
#   → Windows (CMD):
venv\Scripts\activate.bat
#   → macOS/Linux:
source venv/bin/activate
```

```bash
# (solo la primera vez)
pip install -r requirements.txt

# Iniciar el motor matemático
python numerika_math_engine.py
# Queda corriendo en: http://localhost:8000
```

**Verificar que funciona (en otra terminal o con tu browser):**
```bash
curl http://localhost:8000/health
# Debe responder: {"status":"healthy","service":"NumérikaAI Math Engine",...}
```

---

## ✅ Setup Completo (3 servicios)

Para usar login/register, guardar datos y chat con IA.

### Terminal 3: Backend Express (Node.js + PostgreSQL)

> **Nota:** Requiere tener PostgreSQL corriendo (ver sección Docker más abajo).

```bash
# Abrir TERMINAL 3
cd numerika-ai

# Completar archivo .env con todos los datos:
cp .env.example .env
```

**Editar `.env` con tus credenciales:**
```env
PORT=3000
DATABASE_URL=postgresql://tu_usuario:tu_password@localhost:5432/tu_base_de_datos
JWT_SECRET=cambia_esto_en_produccion
OPENAI_API_KEY=sk-tu-key-aqui
VITE_API_URL=http://localhost:3000
```

```bash
# Iniciar servidor Express
npm start
# Queda corriendo en: http://localhost:3000
```

---

## 🐳 Docker (Alternativa: Base de Datos)

Si tenés Docker instalado, podés levantar PostgreSQL y Redis con un solo comando:

```bash
# Desde la raíz del proyecto
docker-compose up -d

# Servicios que se levantan:
# - PostgreSQL   → localhost:5432
# - Redis        → localhost:6379
```

**Ver logs:**
```bash
docker-compose logs -f
```

**Detener todo:**
```bash
docker-compose down
```

---

## 📡 Resumen de Puertos

| Servicio | Puerto | Descripción | ¿Obligatorio? |
|----------|--------|-------------|---------------|
| **Vite Dev Server** | `5173` | Frontend React | ✅ Sí |
| **Math Engine** | `8000` | Motor matemático (FastAPI) | ✅ Sí |
| **Express API** | `3000` | Auth + IA (Node.js) | ❌ Opcional |
| **PostgreSQL** | `5432` | Base de datos | ❌ Opcional (solo si usás Express) |
| **Redis** | `6379` | Cache (futuro) | ❌ Opcional |

---

## 📌 Rutas Disponibles

| Ruta | Página | Requiere Auth |
|------|--------|---------------|
| `/` | Home | No |
| `/solver` | Solver de métodos numéricos | No |
| `/solver/:methodId` | Solver con método pre-seleccionado | No |
| `/comparar` | Comparación de métodos | No |
| `/metodos` | Lista de métodos disponibles | No |
| `/aplicaciones` | Aplicaciones de métodos numéricos | No |
| `/aplicaciones/:appId` | Aplicación específica | No |
| `/calculadora` | Calculadora simbólica (Motor Matemático) | No |
| `/register` | Registro de usuario | No |
| `/login` | Inicio de sesión | No |

---

## 🧪 Testing del Motor Matemático

```bash
# Derivada
curl -X POST http://localhost:8000/api/math/derive \
  -H "Content-Type: application/json" \
  -d '{"expression":"x^2 + 3*x", "variable":"x"}'
# → {"latex":"2 x + 3", "plain":"2*x + 3", ...}

# Integral
curl -X POST http://localhost:8000/api/math/integrate \
  -H "Content-Type: application/json" \
  -d '{"expression":"x^2", "variable":"x"}'
# → {"latex":"\\frac{x^{3}}{3} + C", ...}

# Resolver ecuación
curl -X POST http://localhost:8000/api/math/solve \
  -H "Content-Type: application/json" \
  -d '{"equation":"x^2 - 4 = 0", "variable":"x"}'
# → {"solutions":[{"latex":"-2"},{"latex":"2"}], "count":2, ...}

# Simplificar
curl -X POST http://localhost:8000/api/math/simplify \
  -H "Content-Type: application/json" \
  -d '{"expression":"(x^2 - 1)/(x - 1)", "variable":"x"}'

# Factorizar
curl -X POST http://localhost:8000/api/math/factorize \
  -H "Content-Type: application/json" \
  -d '{"expression":"x^2 + 5*x + 6", "variable":"x"}'

# Validar sintaxis
curl -X POST http://localhost:8000/api/math/validate \
  -H "Content-Type: application/json" \
  -d '{"expression":"x^2 + 3*x"}'
```

---

## ⚠️ Troubleshooting

### "Port 5173 already in use"
```bash
# Encontrar y matar el proceso
npx kill-port 5173
```

### "Port 8000 already in use"
```bash
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### "NetworkError when attempting to fetch resource" en Calculadora
El motor matemático no está corriendo. Inicialo con:
```bash
cd backend && .\venv\Scripts\activate && python numerika_math_engine.py
```

### CORS errors en el browser
Asegurate de que el motor matemático esté corriendo en `http://localhost:8000` y que CORS esté habilitado (ya viene configurado por defecto).

### "Cannot find module 'sympy'" o errores de Python
```bash
cd backend
.\venv\Scripts\activate
pip install -r requirements.txt
```

### (Linux) Vite arranca pero nunca muestra la URL / se cuelga
`node_modules` fue instalado en otra plataforma (binarios de Windows). Reinstalá limpio:
```bash
rm -rf node_modules package-lock.json
npm install
```

### (Linux) "invalid ELF header" en `better-sqlite3`
Mismo origen que el anterior (binario nativo de otra plataforma). Se resuelve con el reinstall de arriba, o puntualmente con:
```bash
npm rebuild better-sqlite3
```

### (Linux) "ensurepip is not available" al crear el venv
Falta el paquete `python3-venv`. Instalalo con `sudo apt install python3-venv`, o usá la **Opción B** de la sección "Setup en Linux" (vía `virtualenv`, sin `sudo`).
