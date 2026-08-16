import { after, type NextRequest } from 'next/server';
import pool from '@/lib/db';
import { checkCsrf, requireEditor } from '@/lib/api-auth';
import { verifySession } from '@/lib/dal';
import { logAudit } from '@/lib/audit';
import { revalidateTeam } from '@/lib/revalidate';
import { sanitizePlainText } from '@/lib/sanitize';
import { teamMemberSchema } from '@/lib/schemas';
import { logger } from '@/lib/logger';
import {
  created,
  csrfFailed,
  invalidJson,
  ok,
  parseJsonBody,
  serverError,
  validationFailed,
} from '@/lib/http';

export const dynamic = 'force-dynamic';

/** Safe for the public team page — no direct contact details. */
const PUBLIC_COLUMNS = 'id, name, role, bio, linkedin, photo_url, sort_order';
const ADMIN_COLUMNS = `${PUBLIC_COLUMNS}, phone, email, whatsapp, is_active, created_at, updated_at`;

/**
 * Team listing.
 *
 * This previously returned `phone`, `email` and `whatsapp` for **every** member
 * including deactivated ones, to anybody — handing out staff direct lines and
 * inboxes to scrapers. The public shape now excludes contact fields entirely and
 * only includes active members; the full row is returned solely to a session.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await verifySession();

    if (session) {
      const [rows] = await pool.execute(
        `SELECT ${ADMIN_COLUMNS} FROM team_members
          WHERE deleted_at IS NULL
          ORDER BY sort_order, name`
      );
      return ok(rows);
    }

    const [rows] = await pool.execute(
      `SELECT ${PUBLIC_COLUMNS} FROM team_members
        WHERE is_active = 1 AND deleted_at IS NULL
        ORDER BY sort_order, name`
    );
    return ok(rows);
  } catch (err) {
    logger.error('team.list_failed', { err });
    return serverError('Could not load the team', err);
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireEditor(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const validation = teamMemberSchema.safeParse(parsed.data);
  if (!validation.success) return validationFailed(validation.error.issues);

  const d = validation.data;
  const name = sanitizePlainText(d.name);

  try {
    const [result] = await pool.execute(
      `INSERT INTO team_members
         (name, role, bio, linkedin, photo_url, phone, email, whatsapp, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        sanitizePlainText(d.role),
        sanitizePlainText(d.bio ?? ''),
        d.linkedin || null,
        d.photo_url ?? '',
        d.phone ?? '',
        d.email || null,
        d.whatsapp ?? '',
        d.sort_order ?? 0,
        d.is_active ?? 1,
      ]
    );

    const id = (result as any).insertId as number;
    revalidateTeam();

    after(() =>
      logAudit({
        action: 'create',
        entity: 'team_member',
        entityId: id,
        actor: session,
        after: { name, role: d.role },
        request,
      })
    );

    return created({ id });
  } catch (err) {
    logger.error('team.create_failed', { err });
    return serverError('Could not create the team member', err);
  }
}
