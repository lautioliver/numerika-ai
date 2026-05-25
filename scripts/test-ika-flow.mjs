/**
 * Smoke test end-to-end del flujo de IKA:
 * 1. Registrar usuario de prueba (o loguear si ya existe)
 * 2. Mandar mensaje a /api/ai/chat
 * 3. Verificar que Gemini responda
 */

const API = 'http://localhost:3000';
const TEST_USER = {
  firstName: 'TestIKA',
  lastName: 'Smoke',
  email: 'test-ika-smoke@numerika.local',
  password: 'TestIKA-2026!',
  institution: 'NumerikaAI Demo',
  role: 'student',
};

async function jsonFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

console.log('🧪 Smoke test del flujo IKA\n');

console.log('1) Registrando usuario de prueba...');
let reg = await jsonFetch('/api/auth/register', { method: 'POST', body: TEST_USER });

let token;
if (reg.status === 201 && reg.data.token) {
  console.log('   ✅ Registrado nuevo. Token recibido.');
  token = reg.data.token;
} else if (reg.status === 400 && /registrado/i.test(reg.data.error || '')) {
  console.log('   ℹ️  Usuario ya existe. Logueando...');
  const login = await jsonFetch('/api/auth/login', {
    method: 'POST',
    body: { email: TEST_USER.email, password: TEST_USER.password },
  });
  if (login.status !== 200 || !login.data.token) {
    console.error('   ❌ Login falló:', login.status, login.data);
    process.exit(2);
  }
  console.log('   ✅ Login OK.');
  token = login.data.token;
} else {
  console.error('   ❌ Registro falló:', reg.status, reg.data);
  process.exit(2);
}

console.log('\n2) Mandando mensaje a IKA...');
const chat = await jsonFetch('/api/ai/chat', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + token },
  body: {
    message: 'Hola IKA, en una sola línea: ¿qué es el método de la bisección?',
    context: 'Página: Smoke Test. Detalles: validación inicial del setup.',
  },
});

if (chat.status === 200 && chat.data.success) {
  console.log('   ✅ IKA respondió:');
  console.log('   "' + chat.data.reply + '"');
  process.exit(0);
} else {
  console.error('   ❌ Chat falló:', chat.status, chat.data);
  process.exit(3);
}
