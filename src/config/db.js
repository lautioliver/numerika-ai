// src/config/db.js
// Intenta conectar a PostgreSQL (Railway/producción).
// Si falla, usa SQLite local como fallback para desarrollo.

import 'dotenv/config';
import dns from 'node:dns';

if (process.env.VERCEL) {
  dns.setDefaultResultOrder('ipv4first');
}

let queryFn;
let dbType = 'unknown';
let initialized = false;
let initPromise = null;

function buildFromPostgresParts() {
  const host = process.env.POSTGRES_HOST;
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  if (!host || !user || !password) return null;

  const port = process.env.POSTGRES_PORT || (host.includes('pooler') ? '6543' : '5432');
  const database = process.env.POSTGRES_DATABASE || 'postgres';
  const encodedUser = encodeURIComponent(user);
  const encodedPass = encodeURIComponent(password);

  return `postgresql://${encodedUser}:${encodedPass}@${host}:${port}/${database}?sslmode=require`;
}

export function getDbEnvFlags() {
  return {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    POSTGRES_URL: Boolean(process.env.POSTGRES_URL),
    POSTGRES_PRISMA_URL: Boolean(process.env.POSTGRES_PRISMA_URL),
    POSTGRES_HOST: Boolean(process.env.POSTGRES_HOST),
    POSTGRES_USER: Boolean(process.env.POSTGRES_USER),
    POSTGRES_PASSWORD: Boolean(process.env.POSTGRES_PASSWORD),
  };
}

function resolveDatabaseUrl() {
  const fromParts = buildFromPostgresParts();
  const candidates = process.env.VERCEL
    ? [
        ['POSTGRES_URL', process.env.POSTGRES_URL],
        ['POSTGRES_PARTS', fromParts],
        ['POSTGRES_PRISMA_URL', process.env.POSTGRES_PRISMA_URL],
        ['DATABASE_URL', process.env.DATABASE_URL],
      ]
    : [
        ['DATABASE_URL', process.env.DATABASE_URL],
        ['POSTGRES_URL', process.env.POSTGRES_URL],
        ['POSTGRES_PARTS', fromParts],
        ['POSTGRES_PRISMA_URL', process.env.POSTGRES_PRISMA_URL],
      ];

  for (const [source, url] of candidates) {
    if (url) return { url, source };
  }
  return { url: null, source: null };
}

function normalizePostgresUrl(rawUrl) {
  let url = rawUrl.trim();
  const isSupabase = /supabase\.co/i.test(url);
  const isPooler = /pooler\.supabase\.com/i.test(url);

  if (isSupabase && !/sslmode=/i.test(url)) {
    url += `${url.includes('?') ? '&' : '?'}sslmode=require`;
  }
  if (isPooler && /:6543/.test(url) && !/pgbouncer=/i.test(url)) {
    url += `${url.includes('?') ? '&' : '?'}pgbouncer=true`;
  }

  return { url, isSupabase, isPooler };
}

function buildPgPoolConfig(connectionString) {
  const needsSsl =
    process.env.VERCEL ||
    /supabase\.co|neon\.tech|railway\.app|sslmode=require/i.test(connectionString);

  const base = {
    connectionTimeoutMillis: 20000,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    max: process.env.VERCEL ? 1 : 10,
    idleTimeoutMillis: 10000,
  };

  try {
    const parsed = new URL(connectionString);
    if (parsed.username && parsed.password && parsed.hostname) {
      return {
        ...base,
        host: parsed.hostname,
        port: Number(parsed.port || 5432),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.replace(/^\//, '') || 'postgres',
        ...(parsed.searchParams.get('sslmode') === 'require' ? { ssl: { rejectUnauthorized: false } } : {}),
      };
    }
  } catch {
    // fallback to connection string
  }

  return { ...base, connectionString };
}

export function getDbConnectionInfo() {
  const { url: raw, source } = resolveDatabaseUrl();
  if (!raw) return { configured: false };

  try {
    const parsed = new URL(raw);
    const isPooler = /pooler\.supabase\.com/i.test(parsed.hostname);
    return {
      configured: true,
      source,
      host: parsed.hostname,
      port: parsed.port || '5432',
      user: parsed.username,
      isPooler,
      poolerUserOk: !isPooler || parsed.username.includes('.'),
      sslmode: parsed.searchParams.get('sslmode'),
      pgbouncer: parsed.searchParams.get('pgbouncer'),
    };
  } catch {
    return { configured: true, source, parseError: true };
  }
}

async function initialize() {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Try PostgreSQL first
    const { url: dbUrl } = resolveDatabaseUrl();
    if (dbUrl) {
      try {
        const pkg = await import('pg');
        const { Pool } = pkg.default;
        const { url: connectionString, isSupabase } = normalizePostgresUrl(dbUrl);

        const pool = new Pool(buildPgPoolConfig(connectionString));

        await pool.query({ text: 'SELECT 1 AS ok', prepare: false });
        console.log('✅ Conectado a PostgreSQL');
        dbType = 'postgres';

        // Supavisor (transaction pooler) no soporta prepared statements en node-pg
        const useSimpleQuery = Boolean(process.env.VERCEL || isSupabase);
        queryFn = (text, params) =>
          useSimpleQuery
            ? pool.query({ text, values: params, prepare: false })
            : pool.query(text, params);
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
      throw new Error('DATABASE_URL / POSTGRES_URL no configurada en Vercel.');
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