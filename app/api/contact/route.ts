import { after, type NextRequest } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { sendMail, contactAcknowledgement, adminNotification } from '@/lib/mail';
import { getSetting } from '@/lib/settings';
import { rateLimit } from '@/lib/api-auth';
import { sanitizePlainText } from '@/lib/sanitize';
import { logger, redactIp } from '@/lib/logger';
import { getClientIp, getCountry, hashIp, isBotUserAgent, parseUserAgent } from '@/lib/request-meta';
import {
  invalidJson,
  ok,
  parseJsonBody,
  serverError,
  tooManyRequests,
  validationFailed,
} from '@/lib/http';

export const dynamic = 'force-dynamic';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').max(255),
  phone: z.string().min(1, 'Phone is required').max(20),
  company: z.string().max(200).optional().default(''),
  service: z.string().min(1, 'Please select a service').max(200),
  message: z.string().min(1, 'Message is required').max(5000),

  /**
   * Spam controls.
   * `contact_reason` is a honeypot: hidden in the form, so only a bot fills it.
   * `form_started_at` is set on mount; a submission faster than MIN_FILL_MS was
   * almost certainly scripted.
   */
  contact_reason: z.string().max(200).optional().default(''),
  form_started_at: z.coerce.number().int().optional(),
});

const MIN_FILL_MS = 2500;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || '';

  const limit = rateLimit(`contact:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const validation = contactSchema.safeParse(parsed.data);
  if (!validation.success) return validationFailed(validation.error.issues);

  const { name, email, phone, company, service, message, contact_reason, form_started_at } = validation.data;

  /**
   * Silent rejection for spam signals.
   *
   * A bot is told "success" so it doesn't learn what tripped the filter and retry
   * with a different shape. Nothing is stored and no mail is sent.
   */
  const elapsed = form_started_at ? Date.now() - form_started_at : Number.POSITIVE_INFINITY;
  const looksAutomated = Boolean(contact_reason) || elapsed < MIN_FILL_MS || isBotUserAgent(userAgent);

  if (looksAutomated) {
    logger.warn('contact.spam_rejected', {
      ip: redactIp(ip),
      honeypot: Boolean(contact_reason),
      elapsed: Number.isFinite(elapsed) ? elapsed : null,
      bot: isBotUserAgent(userAgent),
    });
    return ok({ success: true });
  }

  const url = new URL(request.url);
  const referrer = request.headers.get('referer') || '';
  const sourcePage = url.searchParams.get('source') || referrer;
  const { device, browser } = parseUserAgent(userAgent);

  // Strip any markup at the boundary; the values reach an email and the admin UI.
  const safe = {
    name: sanitizePlainText(name),
    email: email.trim(),
    phone: sanitizePlainText(phone),
    company: sanitizePlainText(company ?? ''),
    service: sanitizePlainText(service),
    message: sanitizePlainText(message),
  };

  let submissionId: number;
  try {
    const [result] = await pool.execute(
      `INSERT INTO submissions
         (name, email, phone, company, service, message, source_page,
          utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer,
          ip_hash, country, device, browser, mail_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        safe.name,
        safe.email,
        safe.phone,
        safe.company,
        safe.service,
        safe.message,
        sourcePage.slice(0, 500),
        url.searchParams.get('utm_source')?.slice(0, 200) || null,
        url.searchParams.get('utm_medium')?.slice(0, 200) || null,
        url.searchParams.get('utm_campaign')?.slice(0, 200) || null,
        url.searchParams.get('utm_term')?.slice(0, 200) || null,
        url.searchParams.get('utm_content')?.slice(0, 200) || null,
        referrer.slice(0, 500),
        // These three columns existed but were never populated.
        ip !== 'unknown' ? hashIp(ip) : null,
        getCountry(request)?.slice(0, 100) || null,
        device,
        browser,
      ]
    );
    submissionId = (result as any).insertId;
  } catch (err) {
    logger.error('contact.insert_failed', { err, ip: redactIp(ip) });
    return serverError('Could not submit your enquiry. Please try again.', err);
  }

  /**
   * Mail moves off the request path.
   *
   * Both sends were previously awaited inline, so the visitor waited on two SMTP
   * round trips — several seconds on a bad day — before the form acknowledged
   * anything. `after()` runs this once the response has been sent.
   */
  after(async () => {
    const [ack, adminEmail] = await Promise.all([
      contactAcknowledgement(safe.name, safe.service).then((html) =>
        sendMail({
          to: safe.email,
          subject: 'We received your enquiry - NextMove Services',
          html,
        })
      ),
      getSetting('email').then((v) => v || process.env.MAIL_TO || process.env.MAIL_USER),
    ]);

    let adminResult: { success: boolean; error?: string } = { success: true };
    if (adminEmail) {
      adminResult = await sendMail({
        to: adminEmail,
        subject: `New Lead: ${safe.name} - ${safe.service}`,
        html: adminNotification(safe.name, safe.email, safe.phone, safe.company, safe.service, safe.message),
        replyTo: safe.email,
      });
    }

    // Record both outcomes. Previously only the acknowledgement was tracked, so a
    // failure to notify the admin left no trace and the lead could be missed.
    const failures = [
      !ack.success && `ack: ${ack.error}`,
      !adminResult.success && `admin: ${adminResult.error}`,
    ].filter(Boolean);

    try {
      await pool.execute('UPDATE submissions SET mail_status = ?, mail_error = ? WHERE id = ?', [
        failures.length === 0 ? 'sent' : 'failed',
        failures.length === 0 ? null : failures.join('; ').slice(0, 2000),
        submissionId,
      ]);
    } catch (err) {
      logger.error('contact.mail_status_update_failed', { err, submissionId });
    }

    if (failures.length > 0) {
      logger.error('contact.mail_failed', { submissionId, failures });
    }
  });

  return ok({ success: true, id: submissionId });
}
