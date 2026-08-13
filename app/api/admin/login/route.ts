import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { createSession, verifyPassword, checkLockout, recordFailedAttempt, resetFailedAttempts } from '@/lib/auth';
import { checkRateLimit } from '@/lib/api-auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  const body = await request.json();
  const validation = loginSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { email, password } = validation.data;

  // Check lockout
  const lockStatus = await checkLockout(email);
  if (lockStatus.locked) {
    const minutes = Math.ceil((lockStatus.remainingMs || 0) / 60000);
    return NextResponse.json({ error: `Account locked. Try again in ${minutes} minutes.` }, { status: 429 });
  }

  // Find user
  const [rows] = await pool.execute(
    'SELECT id, email, password_hash, name, role FROM admin_users WHERE email = ?',
    [email]
  );
  const user = (rows as any[])[0];

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Verify password
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    await recordFailedAttempt(email);
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Success — reset attempts and create session
  await resetFailedAttempts(email);
  await createSession({ userId: user.id, email: user.email, role: user.role });

  return NextResponse.json({
    success: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
