import { notFound } from 'next/navigation';
import pool from '@/lib/db';
import { requireEditor } from '@/lib/dal';
import BlogForm, { type BlogFormValues, type Category } from '@/components/admin/BlogForm';

export const dynamic = 'force-dynamic';

/**
 * The edit route the blog list has always linked to.
 *
 * `app/admin/blog/page.tsx` rendered an Edit link to `/admin/blog/[id]/edit` but
 * this page did not exist, so every Edit click produced a 404.
 */
async function getPost(id: number) {
  const [rows] = await pool.execute(
    `SELECT id, slug, title, excerpt, content, featured_image, image_alt, category_id, author,
            status, published_at, meta_title, meta_description, og_image, canonical_url, noindex
       FROM posts
      WHERE id = ? AND deleted_at IS NULL
      LIMIT 1`,
    [id]
  );
  return (rows as any[])[0] ?? null;
}

async function getCategories(): Promise<Category[]> {
  try {
    const [rows] = await pool.execute('SELECT id, name FROM categories ORDER BY sort_order, name');
    return rows as Category[];
  } catch {
    return [];
  }
}

/** `datetime-local` inputs need `YYYY-MM-DDTHH:MM`, not a MySQL DATETIME string. */
function toDatetimeLocal(value: string | Date | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireEditor();

  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [post, categories] = await Promise.all([getPost(id), getCategories()]);
  if (!post) notFound();

  const initial: Partial<BlogFormValues> = {
    id: post.id,
    title: post.title ?? '',
    slug: post.slug ?? '',
    excerpt: post.excerpt ?? '',
    content: post.content ?? '',
    featured_image: post.featured_image ?? '',
    image_alt: post.image_alt ?? '',
    category_id: post.category_id ?? null,
    author: post.author ?? '',
    status: post.status ?? 'draft',
    published_at: toDatetimeLocal(post.published_at),
    meta_title: post.meta_title ?? '',
    meta_description: post.meta_description ?? '',
    og_image: post.og_image ?? '',
    canonical_url: post.canonical_url ?? '',
    noindex: post.noindex ? 1 : 0,
  };

  return <BlogForm mode="edit" categories={categories} initial={initial} />;
}
