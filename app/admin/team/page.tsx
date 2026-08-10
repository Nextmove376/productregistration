'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  photo_url: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  is_active: number;
}

export default function AdminTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/team')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load team members');
        return res.json();
      })
      .then(setMembers)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this team member?')) return;
    const res = await fetch(`/api/team/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setMembers(members.filter(m => m.id !== id));
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Team Members</h1>
        <Link href="/admin/team/new" className="bg-ink text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90">
          <Plus className="w-4 h-4" /> Add Member
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Photo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {member.photo_url ? (
                    <img src={member.photo_url} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                      {member.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-medium">{member.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{member.role}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {member.phone && <div>{member.phone}</div>}
                  {member.email && <div className="text-xs">{member.email}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${member.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <Link href={`/admin/team/${member.id}/edit`} className="text-blue-600 hover:underline"><Edit className="w-4 h-4" /></Link>
                  <button onClick={() => handleDelete(member.id)} className="text-red-600 hover:underline"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500">No team members yet. Add your first team member!</div>
        )}
      </div>
    </div>
  );
}
