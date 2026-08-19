import { after, type NextRequest } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { checkCsrf, rateLimit, requireAdmin } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { revalidateBlog } from '@/lib/revalidate';
import { getRevision, restoreRevision, RevisionRestoreError } from '@/lib/revisions';
import { logger } from '@/lib/logger';
import { getClientIp } from '@/lib/request-meta';
import {
  adminServerError,
  badRequest,
  csrfFailed,
  invalidJson,
  notFound,
  ok,
  parseJsonBody,
  tooManyRequests,
  validationFailed,
} from '@/lib/http';

export const dynamic = 'force-dynamic';

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * The restore verb is POST, not PUT.
 *
 * Hostinger's shared-hosting proxy has been observed rejecting non-POST verbs on this
 * deployment — the same failure that made `app/api/admin/media/route.ts` grow a POST
 * action envelope. An action field keeps the door open for `compare`/`delete` later
 * without adding a verb the host might refuse.
 */
const actionSchema = z.object({ action: z.literal('restore') });

/** One revision in full, including the body, for previewing before a restore. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; revisionId: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id: rawId, revisionId: rawRevisionId } = await params;
  const id = parseId(rawId);
  const revisionId = parseId(rawRevisionId);
  if (!id) return badRequest('Invalid post id');
  if (!revisionId) return badRequest('Invalid revision id');

  try {
    const revision = await getRevision(id, revisionId);
    if (!revision) return notFound('Revision not found');
    return ok(revision);
  } catch (err) {
    logger.error('revisions.get_failed', { err, id, revisionId });
    return adminServerError('Could not load the revision', err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; revisionId: string }> }
) {
  const { session, error } = await requireAdmin(request);
  if (error) return error;

  if (!checkCsrf(request)) return csrfFailed();

  const limit = rateLimit(`revision-restore:${getClientIp(request)}`, 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const { id: rawId, revisionId: rawRevisionId } = await params;
  const id = parseId(rawId);
  const revisionId = parseId(rawRevisionId);
  if (!id) return badRequest('Invalid post id');
  if (!revisionId) return badRequest('Invalid revision id');

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return invalidJson();

  const validation = actionSchema.safeParse(parsed.data);
  if (!validation.success) return validationFailed(validation.error.issues);

  try {
    const [postRows] = await pool.execute(
      'SELECT id, slug, title, status FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    const post = (postRows as any[])[0];
    if (!post) return notFound('Post not found');

    const revision = await getRevision(id, revisionId);
    if (!revision) return notFound('Revision not found');

    await restoreRevision(id, revisionId, session);

    /**
     * Both slugs, because a restore can move the post's URL.
     *
     * If the revision carries an older slug, the post answers on that URL from now
     * on and the current one must stop serving the post — the same reasoning as the
     * slug change in the blog PUT handler.
     */
    revalidateBlog(revision.slug ?? post.slug);
    if (post.slug && post.slug !== revision.slug) revalidateBlog(post.slug);

    after(() =>
      logAudit({
        action: 'restore',
        entity: 'post',
        entityId: id,
        actor: session,
        before: { slug: post.slug, title: post.title, status: post.status },
        after: { slug: revision.slug, title: revision.title, status: revision.status },
        request,
        meta: { revisionId, revisionNumber: revision.revision_number },
      })
    );

    return ok({
      success: true,
      id,
      revisionId,
      revisionNumber: revision.revision_number,
      slug: revision.slug ?? post.slug,
    });
  } catch (err) {
    if (err instanceof RevisionRestoreError) {
      if (err.code === 'post_not_found') return notFound('Post not found');
      if (err.code === 'revision_not_found') return notFound('Revision not found');
      // 'unavailable' — the migration has not been run on this database.
      return adminServerError('Could not restore this revision', err);
    }
    logger.error('revisions.restore_route_failed', { err, id, revisionId });
    return adminServerError('Could not restore this revision', err);
  }
}
