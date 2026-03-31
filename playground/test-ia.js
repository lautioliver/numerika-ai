import 'dotenv/config';
import { generateExplanation } from './src/services/ai.js';

async function run() {
  console.log('Iniciando test...');
  try {
    const res = await generateExplanation({
      method: 'Biseccion',
      methodId: 'biseccion',
      funcExpr: 'x^2-2',
      params: {a:1, b:2, tolerance:0.01},
      result: {converged: true, root: 1.41, totalIter: 7}
    }, 0);
    console.log('\n✅ RESPUESTA IA:\n', res);
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
  }
}

run();
