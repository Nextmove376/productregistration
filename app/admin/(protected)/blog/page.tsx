import { requireEditor } from '@/lib/dal';
import BlogListClient from '@/components/admin/BlogListClient';

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
  await requireEditor();
  return <BlogListClient />;
}
