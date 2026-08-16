import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

/**
 * On-demand cache invalidation for the public site.
 *
 * Context: this project does NOT enable `cacheComponents`, so it runs on Next's
 * previous caching model. The public pages read MySQL directly via `pool.execute`
 * rather than `fetch`, which means **`revalidateTag` does nothing here** — there
 * are no tagged cache entries to invalidate. `revalidatePath` operates on the
 * full route cache and is the correct primitive for these pages.
 *
 * Every admin mutation must call the matching helper, otherwise the edit lands in
 * the database but never reaches the live site until the next deploy.
 */

function safeRevalidate(path: string, type?: 'page' | 'layout') {
  try {
    if (type) revalidatePath(path, type);
    else revalidatePath(path);
  } catch (err) {
    // Never let a revalidation failure fail the mutation that triggered it.
    logger.error('revalidate.failed', { err, path, type });
  }
}

export function revalidateBlog(slug?: string | null) {
  safeRevalidate('/blog');
  safeRevalidate('/sitemap.xml');
  if (slug) {
    safeRevalidate(`/blog/${slug}`);
  } else {
    // No specific slug (bulk publish, cron): refresh every post page.
    safeRevalidate('/blog/[slug]', 'page');
  }
  // The homepage surfaces latest posts.
  safeRevalidate('/');
}

export function revalidateServices(slug?: string | null) {
  safeRevalidate('/services');
  safeRevalidate('/sitemap.xml');
  if (slug) safeRevalidate(`/services/${slug}`);
  else safeRevalidate('/services/[slug]', 'page');
  safeRevalidate('/');
}

export function revalidateTeam() {
  safeRevalidate('/team');
  safeRevalidate('/about');
}

/**
 * Settings feed the shared header/footer, so the whole layout tree is stale.
 * This is the one case where the broad `('/', 'layout')` sweep is justified.
 */
export function revalidateSettings() {
  safeRevalidate('/', 'layout');
}

export function revalidateMedia() {
  // Media itself is served by a route handler, but featured images appear in
  // listings, so refresh the content surfaces.
  safeRevalidate('/blog');
  safeRevalidate('/services');
}
