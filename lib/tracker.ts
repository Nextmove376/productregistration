import pool from '@/lib/db';
import crypto from 'crypto';

interface TrackingData {
  path: string;
  referrer?: string;
  userAgent?: string;
  ip?: string;
  sessionId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  const device = /Mobile|Android|iPhone/i.test(ua) ? 'Mobile' : 'Desktop';
  let browser = 'Other';
  if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  else if (/Edge/i.test(ua)) browser = 'Edge';

  let os = 'Other';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS';

  return { device, browser, os };
}

function hashIp(ip: string, salt: string): string {
  return crypto.createHash('sha256').update(ip + salt).digest('hex').slice(0, 16);
}

function extractReferrerHost(referrer: string): string | null {
  try {
    return new URL(referrer).hostname;
  } catch {
    return null;
  }
}

export async function trackPageview(data: TrackingData): Promise<void> {
  try {
    const ua = data.userAgent || '';
    const { device, browser, os } = parseUserAgent(ua);
    const salt = process.env.IP_SALT || 'default-salt';
    const ipHash = data.ip ? hashIp(data.ip, salt) : null;
    const referrerHost = data.referrer ? extractReferrerHost(data.referrer) : null;
    const isBot = /bot|crawler|spider|crawling/i.test(ua) ? 1 : 0;

    await pool.execute(
      `INSERT INTO pageviews (path, referrer, referrer_host, utm_source, utm_medium, utm_campaign, utm_term, utm_content, device, browser, os, session_id, ip_hash, is_bot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.path, data.referrer || null, referrerHost, data.utmSource || null, data.utmMedium || null, data.utmCampaign || null, data.utmTerm || null, data.utmContent || null, device, browser, os, data.sessionId || null, ipHash, isBot]
    );
  } catch (err) {
    console.error('Pageview tracking error:', err);
  }
}
