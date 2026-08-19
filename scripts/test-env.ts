/**
 * Placeholder database credentials for tests that never touch a database.
 *
 * `lib/db.ts` throws at module load if these are unset, and `lib/settings-schema` reaches it
 * transitively through `lib/schema`. mysql2 pools connect lazily, so with no query issued
 * nothing here is ever used to reach a server.
 *
 * Imported for its side effect **before** any `lib/` import, which is why it is its own
 * module: import order is evaluation order, so the pool sees these values already set.
 * Existing values win, so this is safe to load next to a real `.env`.
 */

process.env.DB_HOST ||= '127.0.0.1';
process.env.DB_PORT ||= '3306';
process.env.DB_USER ||= 'test';
process.env.DB_PASSWORD ||= 'test';
process.env.DB_NAME ||= 'test';
