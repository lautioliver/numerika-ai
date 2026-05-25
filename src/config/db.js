// src/config/db.js
// Intenta conectar a PostgreSQL (Railway/producción).
// Si falla, usa SQLite local como fallback para desarrollo.

import 'dotenv/config';

let queryFn;
let dbType = 'unknown';
let initialized = false;
let initPromise = null;

async function initialize() {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Try PostgreSQL first
    if (process.env.DATABASE_URL) {
      try {
        const pkg = await import('pg');
        const { Pool } = pkg.default;
        const connectionString = process.env.DATABASE_URL;
        const needsSsl =
          process.env.VERCEL ||
          /supabase\.co|neon\.tech|railway\.app|sslmode=require/i.test(connectionString);

        const pool = new Pool({
          connectionString,
          connectionTimeoutMillis: 10000,
          ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
          max: process.env.VERCEL ? 1 : 10,
        });

        await pool.query('SELECT 1');
        console.log('✅ Conectado a PostgreSQL');
        dbType = 'postgres';

        queryFn = (text, params) => pool.query(text, params);
        initialized = true;
        return;
      } catch (err) {
        console.error('⚠️  PostgreSQL no disponible:', err.message);
        if (process.env.VERCEL) {
          throw new Error(`PostgreSQL requerido en Vercel: ${err.message}`);
        }
        console.log('↪ Usando SQLite local como fallback...');
      }
    }

    if (process.env.VERCEL) {
      throw new Error('DATABASE_URL no configurada en Vercel.');
    }

    // Fallback: SQLite (solo desarrollo local)
    try {
      const { default: Database } = await import('better-sqlite3');
      const path = await import('path');
      const { fileURLToPath } = await import('url');

      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const dbPath = path.join(__dirname, '..', '..', 'numerika_local.db');

      const db = new Database(dbPath);
      db.pragma('journal_mode = WAL');

      // Create users table if it doesn't exist
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          first_name TEXT NOT NULL,
          last_name TEXT DEFAULT '',
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          institution TEXT DEFAULT '',
          role TEXT DEFAULT 'student',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS ika_chats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);

      console.log('✅ Conectado a SQLite local (numerika_local.db)');
      dbType = 'sqlite';

      // Adapter: convert PostgreSQL-style queries to SQLite
      queryFn = (text, params = []) => {
        // Normalize whitespace (template literals may have \n)
        let sqliteText = text.replace(/\s+/g, ' ').trim();

        // Convert $1, $2, ... to ?
        let paramIndex = 1;
        while (sqliteText.includes(`$${paramIndex}`)) {
          sqliteText = sqliteText.replace(`$${paramIndex}`, '?');
          paramIndex++;
        }

        // Handle RETURNING clause
        const returningMatch = sqliteText.match(/RETURNING\s+(.+)$/i);
        if (returningMatch) {
          sqliteText = sqliteText.replace(/\s+RETURNING\s+.+$/i, '');
        }

        const trimmed = sqliteText.trim().toUpperCase();

        if (trimmed.startsWith('SELECT')) {
          const stmt = db.prepare(sqliteText);
          const rows = stmt.all(...params);
          return { rows };
        } else if (trimmed.startsWith('INSERT')) {
          // Extract table name from INSERT INTO <table>
          const tableMatch = sqliteText.match(/INSERT\s+INTO\s+(\w+)/i);
          const tableName = tableMatch ? tableMatch[1] : 'users';

          const stmt = db.prepare(sqliteText);
          const info = stmt.run(...params);
          const insertId = Number(info.lastInsertRowid);

          if (returningMatch) {
            const cols = returningMatch[1].trim();
            const selectStmt = db.prepare(`SELECT ${cols} FROM ${tableName} WHERE id = ?`);
            const row = selectStmt.get(insertId);
            return { rows: row ? [row] : [] };
          }

          return { rows: [], rowCount: info.changes };
        } else {
          const stmt = db.prepare(sqliteText);
          const info = stmt.run(...params);
          return { rows: [], rowCount: info.changes };
        }
      };

      initialized = true;
    } catch (err) {
      console.error('❌ No se pudo inicializar ninguna base de datos:', err.message);
      throw err;
    }
  })();

  return initPromise;
}

// Initialize immediately on import
initialize().catch(err => {
  console.error('❌ Error fatal de DB:', err.message);
});

export const query = async (text, params) => {
  await initialize();
  return queryFn(text, params);
};

export { dbType };