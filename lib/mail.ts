import nodemailer, { type Transporter } from 'nodemailer';
import { escapeHtml } from '@/lib/sanitize';
import { logger } from '@/lib/logger';
import { getPhoneNumbers, getSetting } from '@/lib/settings';

/**
 * Lazily-created transporter.
 *
 * Building it at module load meant every import of this file opened SMTP config
 * (and, on some nodemailer paths, a connection) even for requests that never send
 * mail. Timeouts are set so a wedged SMTP server can't hold a request open
 * indefinitely.
 */
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.hostinger.com',
    port: Number(process.env.MAIL_PORT) || 465,
    secure: Number(process.env.MAIL_PORT || 465) === 465,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
  });

  return transporter;
}

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendMail({
  to,
  subject,
  html,
  replyTo,
}: SendMailParams): Promise<{ success: boolean; error?: string }> {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASSWORD) {
    logger.warn('mail.not_configured', { to, subject });
    return { success: false, error: 'Mail is not configured' };
  }

  try {
    await getTransporter().sendMail({
      from: `"NextMove Services" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
      replyTo,
    });
    return { success: true };
  } catch (err) {
    logger.error('mail.send_failed', { err, to, subject });
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Contact number for templates, from settings with an env/literal fallback. */
async function contactPhone(): Promise<string> {
  const numbers = await getPhoneNumbers();
  if (numbers.length > 0) return numbers[0];
  return process.env.CONTACT_PHONE || '+971 52 910 2088';
}

async function siteName(): Promise<string> {
  return (await getSetting('site_name')) || 'NextMove Services';
}

/** `tel:` hrefs must contain digits and a leading + only. */
function telHref(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return `tel:${escapeHtml(cleaned)}`;
}

/**
 * Every interpolated value is escaped.
 *
 * These templates previously inserted visitor-supplied `name`, `email`, `phone`,
 * `company`, `service` and `message` directly into the HTML, so anyone using the
 * public contact form could inject markup — including links — that rendered inside
 * the admin's inbox and the visitor acknowledgement.
 */
export async function contactAcknowledgement(name: string, service: string): Promise<string> {
  const phone = await contactPhone();
  const brand = escapeHtml(await siteName());

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1a2332; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #e8e4df; margin: 0; font-size: 20px;">${brand}</h1>
      </div>
      <div style="background: #f8f6f3; padding: 32px; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1a2332; margin-top: 0;">Thank you, ${escapeHtml(name)}!</h2>
        <p style="color: #555; line-height: 1.6;">
          We have received your enquiry regarding <strong>${escapeHtml(service)}</strong>.
          Our team will review your message and respond within one business day.
        </p>
        <p style="color: #555; line-height: 1.6;">
          If you need immediate assistance, please call us at
          <a href="${telHref(phone)}" style="color: #0d9488;">${escapeHtml(phone)}</a>.
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
        <p style="color: #888; font-size: 13px;">
          This is an automated acknowledgement. Please do not reply directly to this email.
        </p>
      </div>
    </body>
    </html>
  `;
}

export function adminNotification(
  name: string,
  email: string,
  phone: string,
  company: string,
  service: string,
  message: string
): string {
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone);

  // Escape first, then convert newlines — doing it the other way round would let
  // the escaping destroy the <br> tags we just inserted.
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, '<br>');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1a2332; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #e8e4df; margin: 0; font-size: 20px;">New Lead Submission</h1>
      </div>
      <div style="background: #f8f6f3; padding: 32px; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #888; width: 120px;">Name</td><td style="padding: 8px 0; color: #1a2332; font-weight: 600;">${escapeHtml(name)}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Email</td><td style="padding: 8px 0; color: #1a2332;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Phone</td><td style="padding: 8px 0; color: #1a2332;"><a href="${telHref(phone)}">${safePhone}</a></td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Company</td><td style="padding: 8px 0; color: #1a2332;">${escapeHtml(company) || 'N/A'}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Service</td><td style="padding: 8px 0; color: #1a2332;">${escapeHtml(service)}</td></tr>
        </table>
        <div style="margin-top: 16px; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e5e5e5;">
          <p style="color: #888; margin: 0 0 8px; font-size: 13px;">Message:</p>
          <p style="color: #1a2332; margin: 0; line-height: 1.6;">${safeMessage}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
