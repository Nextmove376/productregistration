'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewTeamMemberPage() {
  const [formData, setFormData] = useState({ name: '', role: '', photo_url: '', whatsapp: '', phone: '', email: '', sort_order: 0 });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error || 'Failed to add team member');
      return;
    }
    router.push('/admin/team');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Add Team Member</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4 max-w-lg">
        <input type="text" placeholder="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required />
        <input type="text" placeholder="Role" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required />
        <input type="text" placeholder="Photo URL" value={formData.photo_url} onChange={(e) => setFormData({...formData, photo_url: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
        <input type="text" placeholder="WhatsApp Number" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
        <input type="text" placeholder="Phone Number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
        <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
        <input type="number" placeholder="Sort Order" value={formData.sort_order} onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" />
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Add Member</button>
      </form>
    </div>
  );
}
