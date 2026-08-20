import pool from '@/lib/db';
import { logger } from '@/lib/logger';
import { getClientIp, hashIp } from '@/lib/request-meta';
import type { SessionPayload } from '@/lib/auth';

/**
 * Append-only admin audit trail.
 *
 * Every mutation records who did what to which row, with before/after snapshots.
 * Call this inside `after()` so a slow or failing audit write can never delay or
 * break the response the admin is waiting on.
 */

export type AuditAction =
  | 'login.success'
  | 'login.failed'
  | 'login.locked'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'purge'
  | 'publish'
  | 'settings.update'
  | 'user.create'
  | 'user.update'
  | 'user.deactivate'
  | 'password.change'
  // Database maintenance run from the admin diagnostics screen.
  | 'schema.repair'
  | 'services.seed'
  | 'encoding.repair'
  // A read, not a mutation — but it exports every row in the database, submissions
  // included, so who took a copy and when is exactly what an audit trail is for.
  | 'db.backup';

export type AuditEntity =
  | 'post'
  | 'service'
  | 'team_member'
  | 'media'
  | 'submission'
  | 'setting'
  | 'category'
  | 'menu'
  | 'user'
  | 'session'
  | 'schema'
  /** The database as a whole, for operations that are not scoped to one table. */
  | 'database';

export interface AuditInput {
  action: AuditAction;
  entity: AuditEntity;
  entityId?: number | string | null;
  actor?: Pick<SessionPayload, 'userId' | 'email'> | null;
  /** Email to record when there is no session yet (e.g. a failed login attempt). */
  actorEmail?: string | null;
  before?: unknown;
  after?: unknown;
  request?: Request | null;
  meta?: Record<string, unknown>;
}

/** Strip anything that must never land in an audit row. */
const REDACTED_KEYS = /^(password|password_hash|token|secret|authorization|cookie)$/i;

function sanitizeSnapshot(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(sanitizeSnapshot);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (REDACTED_KEYS.test(k)) {
        out[k] = '[redacted]';
        continue;
      }
      // Long content columns bloat the table; keep a prefix for context.
      if (typeof v === 'string' && v.length > 2000) {
        out[k] = v.slice(0, 2000) + `…[+${v.length - 2000} chars]`;
        continue;
      }
      out[k] = sanitizeSnapshot(v);
    }
    return out;
  }
  return value;
}

function toJsonColumn(value: unknown): string | null {
  const clean = sanitizeSnapshot(value);
  if (clean === null) return null;
  try {
    return JSON.stringify(clean);
  } catch {
    return null;
  }
}

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const ip = input.request ? getClientIp(input.request) : null;
    const userAgent = input.request?.headers.get('user-agent') ?? null;

    await pool.execute(
      `INSERT INTO audit_log
         (user_id, user_email, action, entity, entity_id, before_json, after_json, ip_hash, user_agent, meta_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.actor?.userId ?? null,
        (input.actor?.email ?? input.actorEmail ?? null)?.slice(0, 255) ?? null,
        input.action,
        input.entity,
        input.entityId != null ? String(input.entityId).slice(0, 64) : null,
        toJsonColumn(input.before),
        toJsonColumn(input.after),
        ip && ip !== 'unknown' ? hashIp(ip) : null,
        userAgent?.slice(0, 500) ?? null,
        toJsonColumn(input.meta),
      ]
    );
  } catch (err) {
    // An audit failure must never break the operation it is describing, but it
    // must be loud in the logs.
    logger.error('audit.write_failed', { err, action: input.action, entity: input.entity, entityId: input.entityId });
  }
}
