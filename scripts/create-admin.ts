import pool from '../lib/db';
import { hashPassword } from '../lib/auth';

async function createAdmin() {
  const args = process.argv.slice(2);
  const getArg = (name: string) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const email = getArg('email') || 'admin@nextmoveservices.ae';
  const name = getArg('name') || 'Administrator';
  const role = (getArg('role') || 'admin') as 'admin' | 'editor';
  const password = getArg('password') || 'ChangeMe123!';

  const passwordHash = await hashPassword(password);

  await pool.execute(
    `INSERT INTO admin_users (email, password_hash, name, role)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name), role = VALUES(role), failed_attempts = 0, locked_until = NULL`,
    [email, passwordHash, name, role]
  );

  console.log(`Admin user created/updated:`);
  console.log(`  Email: ${email}`);
  console.log(`  Name:  ${name}`);
  console.log(`  Role:  ${role}`);
  if (!getArg('password')) {
    console.log(`  Password: ${password} (default — change immediately!)`);
  }

  process.exit(0);
}

createAdmin().catch((err) => {
  console.error('Create admin failed:', err);
  process.exit(1);
});
