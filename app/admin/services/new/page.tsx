'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewServicePage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', slug: '', tag: '', summary: '', icon: '', hero_image: '', sort_order: 0, is_active: 1, meta_title: '', meta_description: '' });
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setSaving(true); const res = await fetch('/api/admin/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); if (res.ok) router.push('/admin/services'); else setSaving(false); };
  return (
    <div>
      <div className="mb-6 flex items-center gap-4"><Link href="/admin/services" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"><ArrowLeft className="h-5 w-5" /></Link><h1 className="text-2xl font-bold tracking-tight">New Service</h1></div>
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Title</label><input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" required /></div>
            <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Slug</label><input type="text" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" pattern="[a-z0-9-]+" required /></div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Tag</label><input type="text" value={form.tag} onChange={e => setForm({...form, tag: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" /></div>
            <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Sort Order</label><input type="number" value={form.sort_order} onChange={e => setForm({...form, sort_order: parseInt(e.target.value)||0})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" /></div>
          </div>
          <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Summary</label><textarea value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" rows={3} /></div>
          <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Hero Image URL</label><input type="text" value={form.hero_image} onChange={e => setForm({...form, hero_image: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" /></div>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Service'}</button>
          <Link href="/admin/services" className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
