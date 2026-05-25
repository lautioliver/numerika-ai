import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 Iniciando NumérikaAI en local...");
console.log("==========================================");

// Función auxiliar para correr comandos con prefijo
function runCommand(command, args, name, colorCode) {
  const child = spawn(command, args, { 
    cwd: __dirname, 
    shell: true,
    stdio: 'pipe' 
  });

  child.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`\x1b[${colorCode}m[${name}]\x1b[0m ${output}`);
    }
  });

  child.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.error(`\x1b[31m[${name} ERROR]\x1b[0m ${output}`);
    }
  });

  child.on('close', (code) => {
    console.log(`\x1b[33m[${name}] Proceso terminado con código ${code}\x1b[0m`);
  });

  return child;
}

// 1. Iniciar el Backend (API) - Color Cyan (36)
const apiProcess = runCommand('node', ['api/index.js'], 'API Backend', 36);

// 2. Iniciar el Frontend (Vite) - Color Magenta (35)
const webProcess = runCommand('npm', ['run', 'dev'], 'Vite Frontend', 35);

// 3. Iniciar el Motor Matemático (Python) - Color Yellow (33)
const mathProcess = runCommand('cmd.exe', ['/c', 'start-math-engine.bat'], 'Math Engine', 33);

// Manejar cierre
process.on('SIGINT', () => {
  console.log("\n🛑 Cerrando todos los servicios...");
  apiProcess.kill('SIGINT');
  webProcess.kill('SIGINT');
  mathProcess.kill('SIGINT');
  process.exit(0);
});
