/**
 * Smoke test: verifica que GEMINI_API_KEY funcione contra gemini-2.0-flash.
 * Uso: node scripts/test-gemini.mjs
 */
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('❌ GEMINI_API_KEY no está definida en .env');
  process.exit(1);
}

console.log('🔑 Key detectada (len=' + key.length + ', prefix=' + key.slice(0, 6) + '...)');
console.log('📡 Pegando a gemini-2.0-flash con un prompt mínimo...');

try {
  const ai = new GoogleGenerativeAI(key);
  const modelName = process.argv[2] || 'gemini-2.0-flash';
  console.log('   modelo: ' + modelName);
  const model = ai.getGenerativeModel({ model: modelName });
  const start = Date.now();
  const res = await model.generateContent('Respondé en una sola línea: ¿qué es el método de Newton-Raphson?');
  const text = res.response.text();
  console.log(`✅ Gemini respondió en ${Date.now() - start}ms:`);
  console.log('   ' + text.trim());
  process.exit(0);
} catch (err) {
  console.error('❌ Falló la llamada a Gemini:');
  console.error('   ' + (err.message || err));
  if (err.status) console.error('   HTTP status: ' + err.status);
  process.exit(2);
}
