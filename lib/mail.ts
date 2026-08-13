import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.hostinger.com',
  port: Number(process.env.MAIL_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendMail({ to, subject, html, replyTo }: SendMailParams): Promise<{ success: boolean; error?: string }> {
  try {
    await transporter.sendMail({
      from: `"NextMove Services" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
      replyTo,
    });
    return { success: true };
  } catch (err) {
    console.error('Email send error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export function contactAcknowledgement(name: string, service: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1a2332; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #e8e4df; margin: 0; font-size: 20px;">NextMove Services</h1>
      </div>
      <div style="background: #f8f6f3; padding: 32px; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1a2332; margin-top: 0;">Thank you, ${name}!</h2>
        <p style="color: #555; line-height: 1.6;">
          We have received your enquiry regarding <strong>${service}</strong>.
          Our team will review your message and respond within one business day.
        </p>
        <p style="color: #555; line-height: 1.6;">
          If you need immediate assistance, please call us at
          <a href="tel:+971529102088" style="color: #0d9488;">+971 52 910 2088</a>.
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

export function adminNotification(name: string, email: string, phone: string, company: string, service: string, message: string): string {
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
          <tr><td style="padding: 8px 0; color: #888; width: 120px;">Name</td><td style="padding: 8px 0; color: #1a2332; font-weight: 600;">${name}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Email</td><td style="padding: 8px 0; color: #1a2332;"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Phone</td><td style="padding: 8px 0; color: #1a2332;"><a href="tel:${phone}">${phone}</a></td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Company</td><td style="padding: 8px 0; color: #1a2332;">${company || 'N/A'}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Service</td><td style="padding: 8px 0; color: #1a2332;">${service}</td></tr>
        </table>
        <div style="margin-top: 16px; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e5e5e5;">
          <p style="color: #888; margin: 0 0 8px; font-size: 13px;">Message:</p>
          <p style="color: #1a2332; margin: 0; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
