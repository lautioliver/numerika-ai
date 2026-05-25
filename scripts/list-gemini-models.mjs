/**
 * Lista los modelos disponibles para la GEMINI_API_KEY actual.
 */
import 'dotenv/config';

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('❌ GEMINI_API_KEY no está definida en .env');
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
const res = await fetch(url);
const data = await res.json();

if (!res.ok) {
  console.error(`❌ ${res.status} ${res.statusText}`);
  console.error(JSON.stringify(data, null, 2));
  process.exit(2);
}

const supported = (data.models || []).filter((m) =>
  (m.supportedGenerationMethods || []).includes('generateContent')
);

console.log(`✅ ${supported.length} modelos disponibles que soportan generateContent:\n`);
for (const m of supported) {
  console.log(`  • ${m.name}  (display: ${m.displayName || '—'})`);
}
