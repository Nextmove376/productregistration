/**
 * Create or update an admin user.
 *
 *   npm run db:admin -- --email you@example.com --name "Your Name" --role admin
 *
 * The password is read from the ADMIN_PASSWORD env var (so it never lands in
 * shell history), or prompted for interactively if the terminal is a TTY.
 * Re-running with an existing email resets that user's password and unlocks
 * the account — handy if you get locked out.
 *
 * Requires DB_HOST / DB_USER / DB_PASSWORD / DB_NAME in the environment.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, argv, env, exit } from 'node:process';
import bcrypt from 'bcryptjs';
import pool from '../lib/db.ts';

function arg(name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : undefined;
}

async function prompt(question: string, { mask = false } = {}): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  if (mask) {
    // Suppress echo so the typed password is not shown on screen.
    const write = (stdout as unknown as { write: (s: string) => void }).write.bind(stdout);
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      if (s.includes('\n') || s.includes('\r')) write(s);
    };
  }
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
    if (mask) stdout.write('\n');
  }
}

async function main() {
  const email = (arg('email') || (await prompt('Admin email: '))).toLowerCase().trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error(`"${email}" is not a valid email address`);
  }

  const name = arg('name') || (await prompt('Display name: ')) || 'Administrator';

  const role = (arg('role') || 'admin').toLowerCase();
  if (role !== 'admin' && role !== 'editor') {
    throw new Error(`Role must be "admin" or "editor", got "${role}"`);
  }

  const password = env.ADMIN_PASSWORD || (await prompt('Password (min 10 chars): ', { mask: true }));
  if (password.length < 10) {
    throw new Error('Password must be at least 10 characters');
  }

  const hash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO admin_users (email, password_hash, name, role)
       VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       password_hash = VALUES(password_hash),
       name = VALUES(name),
       role = VALUES(role),
       failed_attempts = 0,
       locked_until = NULL`,
    [email, hash, name, role]
  );

  console.log(`\n  ✓ Admin user ready: ${email} (${role})`);
  await pool.end();
}

main().catch((err) => {
  console.error('\nCould not create admin user:', err instanceof Error ? err.message : err);
  exit(1);
});
