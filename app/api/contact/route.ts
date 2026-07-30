import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sanitizeHTML } from '@/lib/sanitize';

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  phone: z.string().max(30).optional().or(z.literal('')),
  company: z.string().max(200).optional().or(z.literal('')),
  service: z.string().max(200).optional().or(z.literal('')),
  message: z.string().min(1).max(5000),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = contactSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
  }

  const data = validation.data;

  // Sanitize all string fields
  const sanitized = {
    name: sanitizeHTML(data.name),
    email: sanitizeHTML(data.email),
    phone: sanitizeHTML(data.phone || ''),
    company: sanitizeHTML(data.company || ''),
    service: sanitizeHTML(data.service || ''),
    message: sanitizeHTML(data.message),
  };

  // In production, send email notification or store in DB
  // For now, log to server and return success
  console.log('[Contact Form]', {
    ...sanitized,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, message: 'Your message has been received. We will respond within one business day.' });
}
