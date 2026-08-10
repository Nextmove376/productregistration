import mysql from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: mysql.Pool | undefined;
}

function createPool() {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error('Database env vars missing: set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
  }

  return mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT) || 3306,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    // Hostinger Business allows a limited number of concurrent MySQL connections.
    // Ten is comfortably under the cap while still serving the admin + public site.
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    charset: 'utf8mb4_unicode_ci',
    timezone: 'Z',
    dateStrings: false,
  });
}

// Reuse the pool across hot reloads in dev and across lambda-style invocations,
// otherwise every request opens new connections and exhausts the server limit.
const pool = global.__dbPool ?? createPool();
if (process.env.NODE_ENV !== 'production') global.__dbPool = pool;

export default pool;

/** Run a SELECT and get typed rows back. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

/** Run a SELECT expecting at most one row. */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Run an INSERT/UPDATE/DELETE and get insertId + affectedRows. */
export async function execute(
  sql: string,
  params: unknown[] = []
): Promise<{ insertId: number; affectedRows: number }> {
  const [result] = await pool.execute(sql, params);
  const r = result as mysql.ResultSetHeader;
  return { insertId: r.insertId, affectedRows: r.affectedRows };
}

/** Run several statements atomically; rolls back on any throw. */
export async function transaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
