'use client';
import { useEffect, useState, useRef } from 'react';
import { Upload, Copy, Trash2, Check } from 'lucide-react';

interface MediaItem { id: number; filename: string; path: string; alt: string; size_bytes: number; uploaded_at: string; }

export default function AdminMediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { fetch('/api/admin/media').then(r => r.json()).then(d => { setMedia(d.data || []); setLoading(false); }); }, []);
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
    if (res.ok) { const item = await res.json(); setMedia([item, ...media]); }
    setUploading(false);
  };
  const copyUrl = (path: string, id: number) => { navigator.clipboard.writeText(path); setCopied(id); setTimeout(() => setCopied(null), 2000); };
  const handleDelete = async (id: number) => { if (!confirm('Delete this media file?')) return; await fetch(`/api/admin/media/${id}`, { method: 'DELETE' }); setMedia(media.filter(m => m.id !== id)); };
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
        <button onClick={() => inputRef.current?.click()} className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"><Upload className="h-4 w-4" /> Upload</button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>
      {uploading && <div className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">Uploading...</div>}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {loading ? <div className="col-span-full p-8 text-center text-gray-400">Loading...</div> : media.length === 0 ? <div className="col-span-full p-8 text-center text-gray-400">No media files</div> : media.map(m => (
          <div key={m.id} className="group rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="aspect-square bg-gray-100"><img src={m.path} alt={m.alt || m.filename} className="h-full w-full object-cover" /></div>
            <div className="p-3"><p className="truncate text-xs text-gray-500">{m.filename}</p><div className="mt-2 flex gap-1"><button onClick={() => copyUrl(m.path, m.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900">{copied === m.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}</button><button onClick={() => handleDelete(m.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
