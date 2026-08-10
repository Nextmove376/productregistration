import { NextResponse } from 'next/server';
import { z } from 'zod';
import { execute } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { getRequestContext } from '@/lib/request-context';
import { rateLimit, tooMany } from '@/lib/api-auth';
import { sendEnquiryNotification, sendEnquiryAcknowledgement } from '@/lib/mail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  company: z.string().trim().max(200).optional().or(z.literal('')),
  service: z.string().trim().max(200).optional().or(z.literal('')),
  message: z.string().trim().min(10).max(5000),
  source_page: z.string().max(300).optional().or(z.literal('')),
  utm: z
    .object({
      source: z.string().max(120).optional(),
      medium: z.string().max(120).optional(),
      campaign: z.string().max(160).optional(),
      term: z.string().max(160).optional(),
      content: z.string().max(160).optional(),
    })
    .optional(),
  // Spam controls — a bot fills the hidden field; a human takes >3s to type.
  website: z.string().max(0).optional(),
  elapsed_ms: z.number().int().nonnegative().optional(),
});

export async function POST(request: Request) {
  const ctx = getRequestContext(request.headers);

  const limit = rateLimit(`enquiry:${ctx.ipHash}`, 5, 3600);
  if (!limit.ok) return tooMany(limit.retryAfter);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please check the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const d = parsed.data;

  // Honeypot / speed trap. Return success so bots don't learn they were caught,
  // but drop the submission.
  if (d.website || (d.elapsed_ms !== undefined && d.elapsed_ms < 3000)) {
    return NextResponse.json({ success: true });
  }

  // Persist FIRST. If SMTP later fails the lead is still captured and shows in
  // the admin inbox flagged for retry — the previous version only logged to
  // stdout, so every enquiry was lost.
  let id: number;
  try {
    const result = await execute(
      `INSERT INTO submissions
        (name, email, phone, company, service, message, source_page,
         utm_source, utm_medium, utm_campaign, utm_term, utm_content,
         referrer, ip_hash, country, city, device, browser, mail_status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending')`,
      [
        d.name, d.email, d.phone || null, d.company || null, d.service || null,
        d.message, d.source_page || null,
        d.utm?.source || null, d.utm?.medium || null, d.utm?.campaign || null,
        d.utm?.term || null, d.utm?.content || null,
        ctx.referrer, ctx.ipHash, ctx.country, ctx.city, ctx.device, ctx.browser,
      ]
    );
    id = result.insertId;
  } catch (err) {
    console.error('[enquiry] database insert failed:', err);
    return NextResponse.json(
      { error: 'We could not save your message. Please call +971 52 910 2088.' },
      { status: 500 }
    );
  }

  const settings = await getSettings();
  const recipients = settings.enquiry_recipients.length
    ? settings.enquiry_recipients
    : [process.env.MAIL_TO || settings.email];

  const enquiry = {
    id,
    name: d.name,
    email: d.email,
    phone: d.phone,
    company: d.company,
    service: d.service,
    message: d.message,
    sourcePage: d.source_page,
    country: ctx.country,
    city: ctx.city,
    utmSource: d.utm?.source,
    utmCampaign: d.utm?.campaign,
  };

  try {
    await sendEnquiryNotification(enquiry, recipients);
    await execute('UPDATE submissions SET mail_status = ? WHERE id = ?', ['sent', id]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown mail error';
    console.error('[enquiry] notification failed:', msg);
    await execute('UPDATE submissions SET mail_status = ?, mail_error = ? WHERE id = ?', [
      'failed',
      msg.slice(0, 500),
      id,
    ]);
    // The lead is saved, so this is still a success from the visitor's side.
  }

  // Acknowledgement is best-effort; never fail the request over it.
  try {
    await sendEnquiryAcknowledgement(enquiry);
  } catch (err) {
    console.error('[enquiry] acknowledgement failed:', err);
  }

  return NextResponse.json({
    success: true,
    message: 'Thank you — we have received your enquiry and will respond within one business day.',
  });
}
