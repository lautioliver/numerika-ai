// En src/config/db.js
import pkg from 'pg';
import 'dotenv/config';

const { Pool } = pkg;

// Si existe DATABASE_URL (en la nube), usa esa. 
// Si no, usa los datos sueltos (para tu PC local).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Si decidís usar los campos sueltos, borrá connectionString y dejá los de antes
});

export const query = (text, params) => pool.query(text, params);