import { type NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { listRevisions } from '@/lib/revisions';
import { logger } from '@/lib/logger';
import { adminServerError, badRequest, notFound, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Revision history for one post — summaries only.
 *
 * Admin-only rather than editor-only: history exposes the full past state of drafts
 * along with who wrote them, and restoring is a privileged action, so the listing
 * that drives it is gated the same way.
 *
 * An unmigrated database returns an empty list, not an error. See `lib/revisions.ts`.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const id = parseId((await params).id);
  if (!id) return badRequest('Invalid post id');

  try {
    const [postRows] = await pool.execute(
      'SELECT id, title, slug FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    const post = (postRows as any[])[0];
    if (!post) return notFound('Post not found');

    const revisions = await listRevisions(id);

    return ok({
      post: { id: post.id, title: post.title, slug: post.slug },
      data: revisions,
      total: revisions.length,
    });
  } catch (err) {
    logger.error('revisions.list_failed', { err, id });
    return adminServerError('Could not load the revision history', err);
  }
}
