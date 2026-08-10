import nodemailer from 'nodemailer';
import { escapeHtml } from './sanitize';

let cached: nodemailer.Transporter | null = null;

/**
 * Hostinger SMTP transport. Cached because creating a transport per request
 * re-opens a TLS connection every time, which is slow and hits the mailbox's
 * concurrent-connection limit under load.
 */
function transporter() {
  if (cached) return cached;

  const { MAIL_USER, MAIL_PASSWORD } = process.env;
  if (!MAIL_USER || !MAIL_PASSWORD) {
    throw new Error('MAIL_USER and MAIL_PASSWORD must be set');
  }

  cached = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.hostinger.com',
    port: Number(process.env.MAIL_PORT) || 465,
    secure: true,
    auth: { user: MAIL_USER, pass: MAIL_PASSWORD },
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
  });

  return cached;
}

export type Enquiry = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  service?: string | null;
  message: string;
  sourcePage?: string | null;
  country?: string | null;
  city?: string | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
};

const BRAND = '#0f2233';

/** Notify the team. Recipients come from settings so they're editable in admin. */
export async function sendEnquiryNotification(enquiry: Enquiry, recipients: string[]) {
  const rows: Array<[string, string | null | undefined]> = [
    ['Name', enquiry.name],
    ['Email', enquiry.email],
    ['Phone', enquiry.phone],
    ['Company', enquiry.company],
    ['Service', enquiry.service],
    ['Page', enquiry.sourcePage],
    ['Location', [enquiry.city, enquiry.country].filter(Boolean).join(', ') || null],
    ['Campaign', [enquiry.utmSource, enquiry.utmCampaign].filter(Boolean).join(' / ') || null],
  ];

  const tableRows = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 14px;color:#64748b;font-size:13px;white-space:nowrap">${k}</td>
          <td style="padding:8px 14px;font-size:14px;color:#0f172a">${escapeHtml(String(v))}</td></tr>`
    )
    .join('');

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f1f5f9;padding:28px">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden">
      <div style="background:${BRAND};padding:22px 26px">
        <div style="color:#fff;font-size:17px;font-weight:600">New enquiry #${enquiry.id}</div>
        <div style="color:#94a3b8;font-size:13px;margin-top:3px">productregistrationinuae.com</div>
      </div>
      <table style="width:100%;border-collapse:collapse">${tableRows}</table>
      <div style="padding:14px 26px 26px">
        <div style="color:#64748b;font-size:13px;margin-bottom:6px">Message</div>
        <div style="background:#f8fafc;border-left:3px solid ${BRAND};padding:14px;font-size:14px;color:#0f172a;white-space:pre-wrap;line-height:1.6">${escapeHtml(enquiry.message)}</div>
        <a href="mailto:${escapeHtml(enquiry.email)}"
           style="display:inline-block;margin-top:18px;background:${BRAND};color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-size:14px">Reply to ${escapeHtml(enquiry.name)}</a>
      </div>
    </div>
  </div>`;

  await transporter().sendMail({
    from: `"Next Move Website" <${process.env.MAIL_USER}>`,
    to: recipients.join(', '),
    replyTo: `"${enquiry.name}" <${enquiry.email}>`,
    subject: `New enquiry: ${enquiry.service || 'General'} — ${enquiry.name}`,
    html,
    text: rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nMessage:\n${enquiry.message}`,
  });
}

/** Acknowledge to the person who submitted, so they know it landed. */
export async function sendEnquiryAcknowledgement(enquiry: Enquiry) {
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f1f5f9;padding:28px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:34px">
      <div style="font-size:19px;font-weight:600;color:${BRAND}">Thank you, ${escapeHtml(enquiry.name.split(' ')[0])}</div>
      <p style="color:#475569;font-size:14px;line-height:1.7;margin-top:14px">
        We've received your enquiry${enquiry.service ? ` about <strong>${escapeHtml(enquiry.service)}</strong>` : ''}
        and a consultant will reply within one business day.
      </p>
      <p style="color:#475569;font-size:14px;line-height:1.7">
        If it's urgent, call or WhatsApp us on
        <a href="tel:+971529102088" style="color:${BRAND}">+971 52 910 2088</a>.
      </p>
      <div style="border-top:1px solid #e2e8f0;margin-top:24px;padding-top:16px;color:#94a3b8;font-size:12px">
        Next Move Services — Iliya Tower 1, Office 207, Dubai, UAE
      </div>
    </div>
  </div>`;

  await transporter().sendMail({
    from: `"Next Move Services" <${process.env.MAIL_USER}>`,
    to: enquiry.email,
    subject: 'We received your enquiry — Next Move Services',
    html,
    text: `Thank you, ${enquiry.name}.\n\nWe've received your enquiry and will reply within one business day.\n\nUrgent? Call +971 52 910 2088.\n\nNext Move Services, Dubai, UAE`,
  });
}

/** Used by the admin Settings screen to check SMTP credentials. */
export async function verifySmtp(): Promise<{ ok: boolean; error?: string }> {
  try {
    await transporter().verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown SMTP error' };
  }
}
