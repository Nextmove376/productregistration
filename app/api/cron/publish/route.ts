import { NextResponse, type NextRequest } from 'next/server';
import pool from '@/lib/db';
import { authorizeCron } from '@/lib/cron-auth';
import { revalidateBlog } from '@/lib/revalidate';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Publishes scheduled posts whose time has come.
 *
 * The revalidation here used to be `revalidateTag("blog", "max")`, which was a
 * no-op: this project reads MySQL directly rather than through `fetch`, and
 * `cacheComponents` is not enabled, so no cache entry was ever tagged "blog".
 * Nothing was invalidated and newly-published posts stayed invisible on the live
 * site until the next deploy. `revalidatePath` (via `lib/revalidate.ts`) operates
 * on the route cache and actually works for these pages.
 */
export async function GET(request: NextRequest) {
  const auth = authorizeCron(request, 'publish');
  // 404 rather than 401: an unauthenticated caller learns nothing about whether
  // this endpoint exists.
  if (!auth.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    // Capture which posts are due before flipping them, so the response and the
    // revalidation can name specific slugs.
    const [dueRows] = await pool.execute(
      `SELECT id, slug FROM posts
        WHERE status = 'scheduled' AND published_at <= NOW() AND deleted_at IS NULL`
    );
    const due = dueRows as { id: number; slug: string }[];

    if (due.length === 0) {
      return NextResponse.json({ success: true, published: 0, slugs: [] });
    }

    const [result] = await pool.execute(
      `UPDATE posts SET status = 'published'
        WHERE status = 'scheduled' AND published_at <= NOW() AND deleted_at IS NULL`
    );
    const affected = (result as any).affectedRows as number;

    for (const post of due) revalidateBlog(post.slug);

    logger.info('cron.publish.completed', { published: affected, slugs: due.map((p) => p.slug) });

    return NextResponse.json({
      success: true,
      published: affected,
      slugs: due.map((p) => p.slug),
    });
  } catch (err) {
    logger.error('cron.publish.failed', { err });
    return NextResponse.json({ error: 'Publish job failed' }, { status: 500 });
  }
}
