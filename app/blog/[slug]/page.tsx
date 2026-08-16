import { notFound } from 'next/navigation';
import { after } from 'next/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import pool from '@/lib/db';
import { sanitizeRichText } from '@/lib/sanitize';
import { logger } from '@/lib/logger';

/**
 * ISR floor.
 *
 * Nothing in this project previously declared any caching or revalidation
 * behaviour, so this page was prerendered once at build time and never refreshed:
 * publishing or editing a post in the admin had no effect on the live site until
 * the next deploy. Admin mutations now also call `revalidateBlog()`
 * (`lib/revalidate.ts`) for immediate invalidation; this interval is the backstop.
 */
export const revalidate = 300;

interface BlogPostProps {
  params: Promise<{ slug: string }>;
}

/**
 * `cache()` dedupes within a single render pass.
 *
 * `generateMetadata` and the page body both need the post, and without this the
 * same row was fetched twice per request.
 */
const getPost = cache(async (slug: string) => {
  const [rows] = await pool.execute(
    `SELECT id, slug, title, excerpt, content, featured_image, image_alt, author,
            category_id, published_at, meta_title, meta_description, og_image,
            canonical_url, noindex, reading_minutes
       FROM posts
      WHERE slug = ? AND status = 'published'
        AND (published_at IS NULL OR published_at <= NOW())
        AND deleted_at IS NULL
      LIMIT 1`,
    [slug]
  );
  return (rows as any[])[0] || null;
});

async function getRelatedPosts(currentId: number, categoryId: number | null) {
  // Prefer posts in the same category, then fall back to recent ones.
  const [rows] = await pool.execute(
    `SELECT slug, title, excerpt, featured_image, image_alt, published_at
       FROM posts
      WHERE status = 'published'
        AND (published_at IS NULL OR published_at <= NOW())
        AND deleted_at IS NULL
        AND id != ?
      ORDER BY (category_id IS NOT NULL AND category_id = ?) DESC,
               published_at DESC
      LIMIT 3`,
    [currentId, categoryId]
  );
  return rows as any[];
}

export async function generateMetadata({ params }: BlogPostProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Post Not Found', robots: { index: false, follow: false } };

  return {
    title: post.meta_title || `${post.title} | NextMove Blog`,
    description: post.meta_description || post.excerpt,
    alternates: post.canonical_url ? { canonical: post.canonical_url } : undefined,
    robots: post.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt,
      images: post.og_image ? [post.og_image] : post.featured_image ? [post.featured_image] : undefined,
      type: 'article',
      publishedTime: post.published_at,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostProps) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const related = await getRelatedPosts(post.id, post.category_id ?? null);

  /**
   * View counting moves into `after()`.
   *
   * It was previously a floating promise in the render path — un-awaited, so
   * errors were unhandled, and because the page was build-time static it only ever
   * ran once during the build. `after()` runs it per request, once the response has
   * been streamed.
   */
  after(async () => {
    try {
      await pool.execute('UPDATE posts SET views = views + 1 WHERE id = ?', [post.id]);
    } catch (err) {
      logger.warn('blog.view_increment_failed', { err, id: post.id });
    }
  });

  /**
   * Sanitize on read as well as on write.
   *
   * The write path in `app/api/blog/**` now sanitizes, but rows created before
   * that change are still in the database, and this is the sink that actually
   * executes them.
   */
  const safeContent = sanitizeRichText(post.content || '');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <article>
        <header className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
          <div className="relative mx-auto max-w-4xl px-6 pb-16 pt-24 md:pb-24 md:pt-32">
            <Link
              href="/blog"
              className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--cream)]/60 hover:text-[var(--cream)]"
            >
              {'←'} Back to blog
            </Link>
            <h1 className="text-4xl leading-[1.05] tracking-tight md:text-6xl">{post.title}</h1>
            <div className="mt-6 flex items-center gap-4 text-sm text-[var(--cream)]/60">
              {post.published_at && (
                <time dateTime={new Date(post.published_at).toISOString()}>
                  {new Date(post.published_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </time>
              )}
              {post.reading_minutes > 0 && <span>{post.reading_minutes} min read</span>}
              {post.author && <span>{post.author}</span>}
            </div>
          </div>
        </header>

        {post.featured_image && (
          <div className="mx-auto -mt-8 max-w-4xl px-6">
            <img
              src={post.featured_image}
              alt={post.image_alt || post.title}
              className="w-full rounded-2xl shadow-lg"
            />
          </div>
        )}

        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <div
            className="prose prose-lg max-w-none prose-headings:font-display prose-headings:tracking-tight prose-a:text-[var(--teal-deep)] prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: safeContent }}
          />
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-border bg-[var(--cream)]">
          <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
            <h2 className="font-serif text-3xl">Related articles</h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {related.map((r) => (
                <Link key={r.slug} href={`/blog/${r.slug}`} className="group">
                  {r.featured_image && (
                    <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-[var(--sand)]">
                      <img
                        src={r.featured_image}
                        alt={r.image_alt || r.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                  )}
                  <h3 className="mt-4 font-serif text-lg leading-tight group-hover:text-[var(--teal-deep)]">
                    {r.title}
                  </h3>
                  {r.published_at && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(r.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="grid gap-12 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <h2 className="font-serif text-5xl leading-[1.02] md:text-7xl">
                Have questions?
                <br />
                <em className="text-[var(--teal)]">Let&apos;s talk.</em>
              </h2>
            </div>
            <div className="md:col-span-4">
              <Link
                href="/contact"
                className="group flex items-center justify-between rounded-full bg-[var(--teal)] px-8 py-5 text-[var(--navy)]"
              >
                <span className="font-serif text-lg">Get Consultation</span>
                <span className="text-2xl transition-transform group-hover:translate-x-1">{'→'}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
