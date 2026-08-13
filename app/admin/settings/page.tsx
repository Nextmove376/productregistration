'use client';
import { useEffect, useState } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';

const SETTING_GROUPS = [
  { label: 'General', fields: [
    { key: 'site_name', label: 'Site Name', type: 'text' },
    { key: 'logo_url', label: 'Logo URL', type: 'text' },
    { key: 'footer_text', label: 'Footer Text', type: 'text' },
  ]},
  { label: 'Contact', fields: [
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'address', label: 'Address', type: 'textarea' },
    { key: 'working_hours', label: 'Working Hours', type: 'text' },
  ]},
  { label: 'SEO', fields: [
    { key: 'meta_title', label: 'Default Meta Title', type: 'text' },
    { key: 'meta_description', label: 'Default Meta Description', type: 'textarea' },
  ]},
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  useEffect(() => { fetch('/api/settings').then(r => r.json()).then(d => { setSettings(d); setLoading(false); }); }, []);
  const handleSave = async () => {
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    setSaved(true); setTimeout(() => setSaved(false), 3000);
  };
  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <button onClick={handleSave} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800">{saved ? <><CheckCircle2 className="h-4 w-4" /> Saved!</> : <><Save className="h-4 w-4" /> Save</>}</button>
      </div>
      <div className="max-w-2xl space-y-8">
        {SETTING_GROUPS.map(group => (
          <div key={group.label} className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 font-semibold">{group.label}</h2>
            <div className="space-y-4">
              {group.fields.map(f => (
                <div key={f.key}>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea value={settings[f.key] || ''} onChange={e => setSettings({...settings, [f.key]: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" rows={3} />
                  ) : (
                    <input type={f.type} value={settings[f.key] || ''} onChange={e => setSettings({...settings, [f.key]: e.target.value})} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
