import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import pool from '@/lib/db';

/**
 * ISR floor — see the note in `app/blog/[slug]/page.tsx`. Admin mutations call
 * `revalidateBlog()` for immediate invalidation; this is the backstop.
 */
export const revalidate = 300;

async function getPosts() {
  const [rows] = await pool.execute(
    `SELECT id, slug, title, excerpt, featured_image, image_alt, published_at, reading_minutes
       FROM posts
      WHERE status = 'published'
        AND (published_at IS NULL OR published_at <= NOW())
        AND deleted_at IS NULL
      ORDER BY published_at DESC
      LIMIT 20`
  );
  return rows as any[];
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <section className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, var(--teal), transparent 40%), radial-gradient(circle at 80% 80%, var(--teal-deep), transparent 45%)' }} />
        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-24 md:pt-32">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[var(--cream)]/20 bg-[var(--cream)]/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--cream)]/80">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" /> insights
          </div>
          <h1 className="text-[2rem] leading-tight tracking-tight sm:text-5xl sm:leading-[1.02] md:text-[6rem]">
            Hear directly from<br />
            <span className="italic text-[var(--teal)]/90">our experts.</span>
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 md:py-32">
        {posts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg text-muted-foreground">No posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group overflow-hidden rounded-3xl border border-border transition-all hover:border-[var(--teal)]/40 hover:shadow-lg"
              >
                {post.featured_image && (
                  <div className="relative aspect-[16/10] overflow-hidden bg-[var(--sand)]">
                    {/* Admin uploads, so these can be full-resolution originals served
                        into a ~380px card. `fill` inside the existing fixed ratio plus
                        `sizes` gets the optimiser to hand over a card-sized derivative. */}
                    <Image
                      src={post.featured_image}
                      alt={post.image_alt || post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-6">
                  {/* Date and read time overflowed a narrow card once both were present. */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {post.published_at && (
                      <span>{new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    )}
                    {post.reading_minutes > 0 && <span>{post.reading_minutes} min read</span>}
                  </div>
                  <h3 className="mt-3 font-serif text-xl leading-tight transition-colors group-hover:text-[var(--teal-deep)]">{post.title}</h3>
                  {post.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}
