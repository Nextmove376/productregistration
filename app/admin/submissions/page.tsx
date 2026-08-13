'use client';
import { useEffect, useState } from 'react';
import { Inbox, Eye, Mail } from 'lucide-react';

interface Submission { id: number; name: string; email: string; phone: string; company: string; service: string; message: string; status: string; created_at: string; mail_status: string; }

export default function AdminSubmissionsPage() {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);
  useEffect(() => { fetch('/api/admin/submissions').then(r => r.json()).then(d => { setSubs(d.data || []); setLoading(false); }); }, []);
  const updateStatus = async (id: number, status: string) => { await fetch(`/api/admin/submissions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); setSubs(subs.map(s => s.id === id ? {...s, status} : s)); };
  const filtered = filter === 'all' ? subs : subs.filter(s => s.status === filter);
  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold tracking-tight">Submissions</h1><p className="mt-1 text-sm text-gray-500">Contact form submissions</p></div>
      <div className="mb-4 flex gap-2">{['all','new','contacted','qualified','won','lost'].map(f => <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${filter===f?'bg-gray-900 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{f}</button>)}</div>
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : filtered.length === 0 ? <div className="p-8 text-center text-gray-400">No submissions</div> : (
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500"><tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">Service</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Email</th><th className="px-6 py-3">Date</th><th className="px-6 py-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50"><td className="px-6 py-4 font-medium">{s.name}</td><td className="px-6 py-4 text-sm text-gray-500">{s.service}</td><td className="px-6 py-4"><select value={s.status} onChange={e => updateStatus(s.id, e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs"><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="won">Won</option><option value="lost">Lost</option></select></td><td className="px-6 py-4 text-sm text-gray-500">{s.mail_status}</td><td className="px-6 py-4 text-sm text-gray-500">{new Date(s.created_at).toLocaleDateString()}</td><td className="px-6 py-4"><button onClick={() => setSelected(s)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"><Eye className="h-4 w-4" /></button></td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelected(null)}><div className="mx-4 max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}><h2 className="text-lg font-bold">{selected.name}</h2><p className="mt-1 text-sm text-gray-500">{selected.email} | {selected.phone}</p><p className="mt-1 text-sm text-gray-500">Company: {selected.company || 'N/A'}</p><p className="mt-1 text-sm text-gray-500">Service: {selected.service}</p><div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm">{selected.message}</div><button onClick={() => setSelected(null)} className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm text-white">Close</button></div></div>}
    </div>
  );
}
