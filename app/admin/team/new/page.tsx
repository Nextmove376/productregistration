'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewTeamMemberPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', role: '', bio: '', linkedin: '', photo_url: '', phone: '', email: '', whatsapp: '', sort_order: 0, is_active: 1 });
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setSaving(true); const res = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); if (res.ok) router.push('/admin/team'); else setSaving(false); };
  return (
    <div>
      <div className="mb-6 flex items-center gap-4"><Link href="/admin/team" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"><ArrowLeft className="h-5 w-5" /></Link><h1 className="text-2xl font-bold tracking-tight">New Team Member</h1></div>
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Name</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" required /></div>
            <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Role</label><input type="text" value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" required /></div>
          </div>
          <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Bio</label><textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" rows={3} /></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Phone</label><input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" /></div>
            <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" /></div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">WhatsApp</label><input type="text" value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" /></div>
            <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">LinkedIn URL</label><input type="url" value={form.linkedin} onChange={e => setForm({...form, linkedin: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" /></div>
          </div>
          <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">Photo URL</label><input type="text" value={form.photo_url} onChange={e => setForm({...form, photo_url: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" /></div>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Member'}</button>
          <Link href="/admin/team" className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
