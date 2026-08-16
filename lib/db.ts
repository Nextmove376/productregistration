import mysql from 'mysql2/promise';

const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'] as const;
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

/**
 * TLS to the database.
 *
 * The database is remote (Hostinger), so the connection leaves the app server.
 * Set `DB_SSL=true` to encrypt it. `DB_SSL_REJECT_UNAUTHORIZED=false` allows a
 * self-signed certificate, which shared hosts commonly use — still encrypted,
 * just not certificate-verified.
 */
function sslOption() {
  if (process.env.DB_SSL !== 'true') return undefined;
  return {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  };
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  // Shared hosting caps total connections; keep headroom and make it tunable.
  connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
  queueLimit: 0,
  charset: 'utf8mb4',
  // Store and read DATETIME as UTC so scheduled publishing is not off by the
  // server's local offset.
  timezone: 'Z',
  connectTimeout: 10_000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  // DECIMAL/BIGINT as strings would break arithmetic in the analytics rollups.
  supportBigNumbers: true,
  bigNumberStrings: false,
  dateStrings: false,
  ssl: sslOption(),
});

export default pool;
