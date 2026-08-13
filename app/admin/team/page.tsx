'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface TeamMember { id: number; name: string; role: string; photo_url: string; is_active: number; sort_order: number; }

export default function AdminTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/team').then(r => r.json()).then(d => { setMembers(d); setLoading(false); }); }, []);
  const handleDelete = async (id: number) => { if (!confirm('Delete this team member?')) return; await fetch(`/api/team/${id}`, { method: 'DELETE' }); setMembers(members.filter(m => m.id !== id)); };
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
        <Link href="/admin/team/new" className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"><Plus className="h-4 w-4" /> Add Member</Link>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : members.length === 0 ? <div className="p-8 text-center text-gray-400">No team members</div> : (
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500"><tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">Role</th><th className="px-6 py-3">Active</th><th className="px-6 py-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{members.map(m => (
              <tr key={m.id} className="hover:bg-gray-50"><td className="px-6 py-4 font-medium">{m.name}</td><td className="px-6 py-4 text-sm text-gray-500">{m.role}</td><td className="px-6 py-4"><span className={`rounded-full px-2 py-0.5 text-xs ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{m.is_active ? 'Yes' : 'No'}</span></td><td className="px-6 py-4 flex gap-2"><Link href={`/admin/team/${m.id}/edit`} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"><Edit className="h-4 w-4" /></Link><button onClick={() => handleDelete(m.id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
