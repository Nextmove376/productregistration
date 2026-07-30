'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  photo_url: string;
  whatsapp: string;
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
        <Link href="/admin/team/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Member
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow-md">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Photo</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">WhatsApp</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-t">
                <td className="px-4 py-3"><img src={member.photo_url} alt={member.name} className="w-10 h-10 rounded-full" /></td>
                <td className="px-4 py-3">{member.name}</td>
                <td className="px-4 py-3">{member.role}</td>
                <td className="px-4 py-3">{member.whatsapp}</td>
                <td className="px-4 py-3 flex gap-2">
                  <Link href={`/admin/team/${member.id}/edit`} className="text-blue-600 hover:underline"><Edit className="w-4 h-4" /></Link>
                  <button onClick={() => handleDelete(member.id)} className="text-red-600 hover:underline"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
