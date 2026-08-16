import pool from '@/lib/db';
import { requireEditor } from '@/lib/dal';
import BlogForm, { type Category } from '@/components/admin/BlogForm';

export const dynamic = 'force-dynamic';

async function getCategories(): Promise<Category[]> {
  try {
    const [rows] = await pool.execute('SELECT id, name FROM categories ORDER BY sort_order, name');
    return rows as Category[];
  } catch {
    return [];
  }
}

export default async function NewBlogPostPage() {
  // Per-page check: layouts don't re-run on every client-side navigation, so a
  // layout alone is not a sufficient gate.
  const session = await requireEditor();
  const categories = await getCategories();

  return <BlogForm mode="create" categories={categories} initial={{ author: session.email }} />;
}
