import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genAI = null;
let model = null;

/**
 * Inicializa el cliente de Gemini (lazy — solo cuando se necesita).
 */
function getModel() {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY no está configurada.");
  }
  if (!model) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
  }
  return model;
}

/**
 * Rate limiter simple en memoria.
 * Limita peticiones por IP para no quemar la cuota gratuita.
 */
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000; // 1 minuto
const RATE_LIMIT_MAX = 10;        // máx 10 requests por minuto

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Genera una explicación pedagógica sobre un cálculo numérico.
 * 
 * @param {Object} data - Datos del cálculo
 * @param {string} data.method - Nombre del método (ej: "Bisección")
 * @param {string} data.methodId - ID del método (ej: "biseccion") 
 * @param {string} data.funcExpr - Expresión de la función (ej: "x^2 - x - 2")
 * @param {Object} data.params - Parámetros usados (a, b, x0, x1, tolerance)
 * @param {Object} data.result - Resultado del cálculo
 * @param {boolean} data.result.converged - Si convergió
 * @param {number} data.result.root - Raíz encontrada
 * @param {number} data.result.totalIter - Total de iteraciones
 * @returns {Promise<string>} Explicación en español
 */
export async function generateExplanation(data, retries = 2) {
  const ai = getModel();

  const { method, methodId, funcExpr, params, result } = data;

  const prompt = buildPrompt(method, methodId, funcExpr, params, result);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.generateContent(prompt);
      const text = response.response.text();
      return text;
    } catch (err) {
      const isRateLimit = err.message?.includes("429") || err.message?.includes("retry");
      
      if (isRateLimit && attempt < retries) {
        // Esperar antes de reintentar (backoff exponencial)
        const delay = (attempt + 1) * 2000;
        console.log(`⏳ Rate limit de Gemini, reintentando en ${delay/1000}s... (intento ${attempt + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw err;
    }
  }

  // Si llegamos acá, todos los intentos fallaron por rate limit
  throw new Error("Se agotaron los reintentos por límite de solicitudes de Gemini.");
}

/**
 * Construye el prompt para Gemini.
 * Separado para facilitar futuros ajustes del contexto.
 */
function buildPrompt(method, methodId, funcExpr, params, result) {
  const convergedText = result.converged
    ? `El método CONVERGIÓ a la raíz x ≈ ${result.root} en ${result.totalIter} iteración(es).`
    : `El método NO CONVERGIÓ tras ${result.totalIter} iteraciones.`;

  let paramsText = "";
  if (params.a !== undefined && params.b !== undefined) {
    paramsText = `Intervalo: [${params.a}, ${params.b}]. `;
  }
  if (params.x0 !== undefined) {
    paramsText += `Punto inicial x₀ = ${params.x0}. `;
  }
  if (params.x1 !== undefined) {
    paramsText += `Segundo punto x₁ = ${params.x1}. `;
  }
  paramsText += `Tolerancia: ${params.tolerance}.`;

  return `Sos un tutor de análisis numérico para estudiantes de ingeniería latinoamericanos. 
Respondé en español, de forma clara y pedagógica. Usá un tono amigable pero técnico.

Un estudiante acaba de resolver este problema usando el método de ${method}:

FUNCIÓN: f(x) = ${funcExpr}
PARÁMETROS: ${paramsText}
RESULTADO: ${convergedText}

Tu respuesta debe:
1. Explicar brevemente QUÉ hizo el método en este caso particular (no la teoría general).
2. Si convergió: explicar POR QUÉ convergió (ej: "la función es continua y cambia de signo en el intervalo").
3. Si no convergió: sugerir QUÉ puede hacer el estudiante para arreglarlo.
4. Dar un dato o tip relevante sobre el método.

FORMATO: Respondé en 3-5 oraciones. No uses markdown, ni listas, ni encabezados. Texto plano directo.`;
}

/**
 * Función para interactuar con IKA (Chat Assistant)
 * Mantiene el historial para dar contexto a la respuesta.
 */
export async function chatWithIka(message, context, history = []) {
  // Normalizar historial para garantizar la alternancia user -> model -> user... exigida por Gemini
  const formattedHistory = [];
  for (const msg of history) {
    const role = msg.role === 'user' ? 'user' : 'model';
    if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === role) {
      // Combinar mensajes consecutivos del mismo rol
      formattedHistory[formattedHistory.length - 1].parts[0].text += `\n\n${msg.content}`;
    } else {
      formattedHistory.push({ role, parts: [{ text: msg.content }] });
    }
  }

  // Gemini exige que el ÚLTIMO mensaje antes de .sendMessage sea siempre del 'model'
  if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') {
    formattedHistory.push({ role: 'model', parts: [{ text: 'Entendido, continuemos.' }] });
  }

  const systemInstruction = `Sos "IKA" (Inteligencia Kasual de Aprendizaje), la asistente educativa súper brillante pero cercana y amigable de la plataforma Numérika-AI para estudiantes universitarios de ingeniería latinoamericanos. No sos Gemini, sos IKA.
Tu rol es ayudar al estudiante a entender los métodos numéricos que está usando o estudiando en la plataforma.
Respondé usando markdown, sin excederte en longitud, sé precisa y al punto pero empática.
Contexto actual del sistema/página donde está el usuario (esta info es secreta, usala para entender qué hace): 
[${context}]`;

  // El systemInstruction DYNAMIC requiere instanciar el modelo con esa instrucción
  // (no podemos usar el genérico global porque este tiene memoria y contexto del usuario)
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY no seteada");
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  const ikaModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    systemInstruction,
  });

  // Start chat session with history
  const chat = ikaModel.startChat({
    history: formattedHistory,
  });

  try {
    const result = await chat.sendMessage(message);
    return result.response.text();
  } catch (err) {
    console.error("Error en chatWithIka:", err);
    throw err;
  }
}

export { checkRateLimit };
