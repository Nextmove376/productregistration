'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewBlogPostPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', featured_image: '', status: 'draft' as 'draft'|'published'|'scheduled', published_at: '', meta_title: '', meta_description: '', reading_minutes: 0 });
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setSaving(true); const res = await fetch('/api/blog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); if (res.ok) router.push('/admin/blog'); else setSaving(false); };
  return (
    <div>
      <div className="mb-6 flex items-center gap-4"><Link href="/admin/blog" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"><ArrowLeft className="h-5 w-5" /></Link><h1 className="text-2xl font-bold tracking-tight">New Blog Post</h1></div>
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
          <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Title</label><input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" required /></div>
          <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Slug</label><input type="text" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" pattern="[a-z0-9-]+" required /></div>
          <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Excerpt</label><textarea value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" rows={2} /></div>
          <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Content (HTML)</label><textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono outline-none focus:border-gray-400" rows={15} required /></div>
          <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Featured Image URL</label><input type="text" value={form.featured_image} onChange={e => setForm({...form, featured_image: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" /></div>
          <div className="grid gap-5 sm:grid-cols-3">
            <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Status</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value as any})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"><option value="draft">Draft</option><option value="published">Published</option><option value="scheduled">Scheduled</option></select></div>
            {form.status === 'scheduled' && <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Publish At</label><input type="datetime-local" value={form.published_at} onChange={e => setForm({...form, published_at: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" /></div>}
            <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Reading Minutes</label><input type="number" value={form.reading_minutes} onChange={e => setForm({...form, reading_minutes: parseInt(e.target.value)||0})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" min="0" /></div>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Post'}</button>
          <Link href="/admin/blog" className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
