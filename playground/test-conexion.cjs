// TESTEO PARA LA DB.

const { Pool } = require('pg');
require('dotenv').config();

console.log("🔍 Intentando conectar con:", process.env.DB_USER);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error("❌ ERROR:", err.message);
  } else {
    console.log("✅ ¡CONEXIÓN EXITOSA!");
    console.log("Hora DB:", res.rows[0].now);
  }
  pool.end();
});