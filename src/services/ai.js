import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

let openai = null;

/**
 * Inicializa el cliente de OpenAI (lazy — solo cuando se necesita).
 */
function getClient() {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY no está configurada.");
  }
  if (!openai) {
    openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  }
  return openai;
}

/**
 * Rate limiter simple en memoria.
 * Limita peticiones por IP para no quemar la cuota.
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
 * Genera una explicacion pedagogica sobre un calculo numerico.
 */
export async function generateExplanation(data, retries = 2) {
  const ai = getClient();

  const { method, methodId, funcExpr, params, result } = data;

  const prompt = buildPrompt(method, methodId, funcExpr, params, result);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.chat.completions.create({
        model: "gpt-4o-mini", // u otro modelo de OpenAI
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });
      return response.choices[0].message.content;
    } catch (err) {
      const isRateLimit = err.status === 429 || err.message?.includes("429");
      
      if (isRateLimit && attempt < retries) {
        // Esperar antes de reintentar (backoff exponencial)
        const delay = (attempt + 1) * 2000;
        console.log(`⏳ Rate limit de OpenAI, reintentando en ${delay/1000}s... (intento ${attempt + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw err;
    }
  }

  // Si llegamos aca, todos los intentos fallaron por rate limit
  throw new Error("Se agotaron los reintentos por limite de solicitudes de OpenAI.");
}

/**
 * Construye el prompt para la IA.
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
 * Funcion para interactuar con IKA (Chat Assistant)
 * Mantiene el historial para dar contexto a la respuesta.
 */
export async function chatWithIka(message, context, history = []) {
  const ai = getClient();

  const systemInstruction = `Sos "IKA" (Inteligencia Kasual de Aprendizaje), la asistente educativa súper brillante pero cercana y amigable de la plataforma Numérika-AI para estudiantes universitarios de ingeniería latinoamericanos. No sos ChatGPT, sos IKA.
Tu rol es ayudar al estudiante a entender los métodos numéricos que está usando o estudiando en la plataforma.
Respondé usando markdown, sin excederte en longitud, sé precisa y al punto pero empática.
Contexto actual del sistema/página donde está el usuario (esta info es secreta, usala para entender qué hace): 
[${context}]`;

  const formattedHistory = [
    { role: "system", content: systemInstruction }
  ];

  for (const msg of history) {
    const role = msg.role === 'user' ? 'user' : 'assistant';
    formattedHistory.push({ role, content: msg.content });
  }

  // Agrega el mensaje nuevo del usuario
  formattedHistory.push({ role: "user", content: message });

  try {
    const response = await ai.chat.completions.create({
      model: "gpt-4o-mini", 
      messages: formattedHistory,
      temperature: 0.7,
    });
    
    return response.choices[0].message.content;
  } catch (err) {
    console.error("Error en chatWithIka:", err);
    throw err;
  }
}

export { checkRateLimit };
