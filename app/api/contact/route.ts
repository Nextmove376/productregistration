import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { sendMail, contactAcknowledgement, adminNotification } from '@/lib/mail';
import { getSetting } from '@/lib/settings';
import { checkRateLimit } from '@/lib/api-auth';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone is required').max(20),
  company: z.string().max(200).optional().default(''),
  service: z.string().min(1, 'Please select a service'),
  message: z.string().min(1, 'Message is required').max(5000),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(`contact:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });
  }

  const body = await request.json();
  const validation = contactSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
  }

  const { name, email, phone, company, service, message } = validation.data;

  const url = new URL(request.url);
  const referrer = request.headers.get('referer') || '';
  const sourcePage = url.searchParams.get('source') || referrer;

  const [result] = await pool.execute(
    `INSERT INTO submissions (name, email, phone, company, service, message, source_page,
     utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer, mail_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [name, email, phone, company, service, message, sourcePage,
     url.searchParams.get('utm_source') || null,
     url.searchParams.get('utm_medium') || null,
     url.searchParams.get('utm_campaign') || null,
     url.searchParams.get('utm_term') || null,
     url.searchParams.get('utm_content') || null,
     referrer]
  );
  const submissionId = (result as any).insertId;

  const ackResult = await sendMail({
    to: email,
    subject: 'We received your enquiry - NextMove Services',
    html: contactAcknowledgement(name, service),
  });

  const adminEmail = await getSetting('email') || process.env.MAIL_TO || process.env.MAIL_USER;
  if (adminEmail) {
    await sendMail({
      to: adminEmail,
      subject: `New Lead: ${name} - ${service}`,
      html: adminNotification(name, email, phone, company, service, message),
      replyTo: email,
    });
  }

  const mailStatus = ackResult.success ? 'sent' : 'failed';
  const mailError = ackResult.success ? null : ackResult.error;
  await pool.execute(
    'UPDATE submissions SET mail_status = ?, mail_error = ? WHERE id = ?',
    [mailStatus, mailError, submissionId]
  );

  return NextResponse.json({ success: true, id: submissionId });
}
