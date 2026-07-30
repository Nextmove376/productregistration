'use client';

import { useEffect, useState } from 'react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      alert('Settings saved!');
    } catch {
      alert('Failed to save settings. Please try again.');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Site Settings</h1>
      <div className="bg-white p-6 rounded-lg shadow-md space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium mb-1">Site Name</label>
          <input type="text" value={settings.site_name || ''} onChange={(e) => setSettings({...settings, site_name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Logo URL</label>
          <input type="text" value={settings.logo_url || ''} onChange={(e) => setSettings({...settings, logo_url: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" value={settings.email || ''} onChange={(e) => setSettings({...settings, email: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Address</label>
          <textarea value={settings.address || ''} onChange={(e) => setSettings({...settings, address: e.target.value})} className="w-full px-4 py-2 border rounded-lg" rows={2} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Working Hours</label>
          <input type="text" value={settings.working_hours || ''} onChange={(e) => setSettings({...settings, working_hours: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone Numbers (JSON)</label>
          <textarea value={settings.phone_numbers || ''} onChange={(e) => setSettings({...settings, phone_numbers: e.target.value})} className="w-full px-4 py-2 border rounded-lg font-mono text-sm" rows={4} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">WhatsApp Contacts (JSON)</label>
          <textarea value={settings.whatsapp_contacts || ''} onChange={(e) => setSettings({...settings, whatsapp_contacts: e.target.value})} className="w-full px-4 py-2 border rounded-lg font-mono text-sm" rows={4} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Social Links (JSON)</label>
          <textarea value={settings.social_links || ''} onChange={(e) => setSettings({...settings, social_links: e.target.value})} className="w-full px-4 py-2 border rounded-lg font-mono text-sm" rows={3} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Footer Text</label>
          <input type="text" value={settings.footer_text || ''} onChange={(e) => setSettings({...settings, footer_text: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
        </div>
        <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Save Settings</button>
      </div>
    </div>
  );
}
