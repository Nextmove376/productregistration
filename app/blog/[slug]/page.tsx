import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import pool from '@/lib/db';

interface BlogPostProps {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  const [rows] = await pool.execute(
    "SELECT * FROM posts WHERE slug = ? AND status = 'published'",
    [slug]
  );
  return (rows as any[])[0] || null;
}

async function incrementViews(id: number) {
  await pool.execute('UPDATE posts SET views = views + 1 WHERE id = ?', [id]).catch(() => {});
}

async function getRelatedPosts(currentId: number) {
  const [rows] = await pool.execute(
    "SELECT slug, title, excerpt, featured_image, published_at FROM posts WHERE status = 'published' AND id != ? ORDER BY published_at DESC LIMIT 3",
    [currentId]
  );
  return rows as any[];
}

export async function generateMetadata({ params }: BlogPostProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Post Not Found' };

  return {
    title: post.meta_title || `${post.title} | NextMove Blog`,
    description: post.meta_description || post.excerpt,
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

  incrementViews(post.id);
  const related = await getRelatedPosts(post.id);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <article>
        <header className="relative overflow-hidden bg-[var(--navy)] text-[var(--cream)]">
          <div className="relative mx-auto max-w-4xl px-6 pb-16 pt-24 md:pb-24 md:pt-32">
            <Link href="/blog" className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--cream)]/60 hover:text-[var(--cream)]">
              {'\u2190'} Back to blog
            </Link>
            <h1 className="text-4xl leading-[1.05] tracking-tight md:text-6xl">{post.title}</h1>
            <div className="mt-6 flex items-center gap-4 text-sm text-[var(--cream)]/60">
              {post.published_at && (
                <span>{new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              )}
              {post.reading_minutes > 0 && <span>{post.reading_minutes} min read</span>}
            </div>
          </div>
        </header>

        {post.featured_image && (
          <div className="mx-auto max-w-4xl px-6 -mt-8">
            <img src={post.featured_image} alt={post.title} className="rounded-2xl shadow-lg w-full" />
          </div>
        )}

        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <div
            className="prose prose-lg max-w-none prose-headings:font-display prose-headings:tracking-tight prose-a:text-[var(--teal-deep)] prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: post.content }}
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
                      <img src={r.featured_image} alt={r.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    </div>
                  )}
                  <h3 className="mt-4 font-serif text-lg leading-tight group-hover:text-[var(--teal-deep)]">{r.title}</h3>
                  {r.published_at && (
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(r.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
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
                Have questions?<br /><em className="text-[var(--teal)]">Let&apos;s talk.</em>
              </h2>
            </div>
            <div className="md:col-span-4">
              <Link href="/contact" className="group flex items-center justify-between rounded-full bg-[var(--teal)] px-8 py-5 text-[var(--navy)]">
                <span className="font-serif text-lg">Get Consultation</span>
                <span className="text-2xl transition-transform group-hover:translate-x-1">{'\u2192'}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
