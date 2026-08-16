import pool from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  extractReferrerHost,
  hashIp,
  isBotUserAgent,
  parseUserAgent,
} from '@/lib/request-meta';

interface TrackingData {
  path: string;
  referrer?: string;
  userAgent?: string;
  ip?: string;
  sessionId?: string;
  country?: string | null;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export async function trackPageview(data: TrackingData): Promise<void> {
  try {
    const ua = data.userAgent || '';
    const { device, browser, os } = parseUserAgent(ua);
    const ipHash = data.ip && data.ip !== 'unknown' ? hashIp(data.ip) : null;
    const referrerHost = data.referrer ? extractReferrerHost(data.referrer) : null;
    const isBot = isBotUserAgent(ua) ? 1 : 0;

    await pool.execute(
      `INSERT INTO pageviews (path, referrer, referrer_host, utm_source, utm_medium, utm_campaign, utm_term, utm_content, country, device, browser, os, session_id, ip_hash, is_bot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.path.slice(0, 500),
        data.referrer?.slice(0, 500) || null,
        referrerHost?.slice(0, 200) || null,
        data.utmSource?.slice(0, 200) || null,
        data.utmMedium?.slice(0, 200) || null,
        data.utmCampaign?.slice(0, 200) || null,
        data.utmTerm?.slice(0, 200) || null,
        data.utmContent?.slice(0, 200) || null,
        data.country?.slice(0, 100) || null,
        device,
        browser,
        os,
        data.sessionId?.slice(0, 64) || null,
        ipHash,
        isBot,
      ]
    );
  } catch (err) {
    // Tracking must never surface to the visitor.
    logger.error('pageview.track_failed', { err, path: data.path });
  }
}
