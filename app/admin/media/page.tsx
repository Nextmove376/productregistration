'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Upload, Copy, Trash2, Check, Search, Image as ImageIcon, Edit2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface MediaItem {
  id: number;
  filename: string;
  path: string;
  alt: string;
  width: number | null;
  height: number | null;
  size_bytes: number;
  mime_type: string;
  thumbnail_path: string | null;
  uploaded_at: string;
}

export default function AdminMediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingAlt, setEditingAlt] = useState<number | null>(null);
  const [altText, setAltText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/media?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setMedia(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch media:', err);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files).slice(0, 5); // Max 5 files
    setSelectedFiles(fileArray);
    
    // Create preview URLs
    const urls = fileArray.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);

    const formData = new FormData();
    selectedFiles.forEach((file, i) => {
      formData.append('file', file);
      formData.append('alt', ''); // Can be edited after upload
    });

    try {
      const res = await fetch('/api/admin/media', { method: 'POST', body: formData });
      if (res.ok) {
        const result = await res.json();
        setSelectedFiles([]);
        setPreviewUrls([]);
        fetchMedia(); // Refresh the list
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const copyUrl = (path: string, id: number) => {
    const fullUrl = `https://productregistrationinuae.com${path}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this media file? This action cannot be undone.')) return;
    try {
      await fetch(`/api/admin/media/${id}`, { method: 'DELETE' });
      setMedia(media.filter(m => m.id !== id));
      setTotal(prev => prev - 1);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const updateAltText = async (id: number) => {
    try {
      await fetch(`/api/admin/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alt: altText }),
      });
      setMedia(media.map(m => m.id === id ? { ...m, alt: altText } : m));
      setEditingAlt(null);
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
          <p className="text-sm text-gray-500 mt-1">{total} files</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Upload className="h-4 w-4" /> Upload
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </div>
      </div>

      {/* Upload Preview */}
      {selectedFiles.length > 0 && (
        <div className="mb-6 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Selected Files ({selectedFiles.length})</h3>
            <button onClick={() => { setSelectedFiles([]); setPreviewUrls([]); }} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-4">
            {previewUrls.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-200">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 truncate">
                  {selectedFiles[i].name}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setSelectedFiles([]); setPreviewUrls([]); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`mb-6 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
        }`}
      >
        <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-sm text-gray-600">
          Drag and drop images here, or{' '}
          <button onClick={() => inputRef.current?.click()} className="text-blue-600 hover:underline">
            browse files
          </button>
        </p>
        <p className="text-xs text-gray-400 mt-2">Supports: JPG, PNG, WebP, SVG, GIF (max 10MB each)</p>
      </div>

      {/* Media Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {loading ? (
          <div className="col-span-full p-8 text-center text-gray-400">Loading...</div>
        ) : media.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-400">
            {search ? 'No files match your search' : 'No media files uploaded yet'}
          </div>
        ) : media.map(m => (
          <div key={m.id} className="group rounded-2xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative aspect-square bg-gray-100">
              <img
                src={m.thumbnail_path || m.path}
                alt={m.alt || m.filename}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-2">
                  <button
                    onClick={() => copyUrl(m.path, m.id)}
                    className="rounded-lg bg-white/90 p-2 text-gray-700 hover:bg-white"
                    title="Copy URL"
                  >
                    {copied === m.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => { setEditingAlt(m.id); setAltText(m.alt); }}
                    className="rounded-lg bg-white/90 p-2 text-gray-700 hover:bg-white"
                    title="Edit alt text"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="rounded-lg bg-white/90 p-2 text-red-600 hover:bg-white"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-3">
              <p className="truncate text-xs font-medium text-gray-900">{m.filename}</p>
              {editingAlt === m.id ? (
                <div className="mt-2 flex gap-1">
                  <input
                    type="text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs"
                    placeholder="Alt text for SEO..."
                    autoFocus
                  />
                  <button onClick={() => updateAltText(m.id)} className="px-2 py-1 bg-gray-900 text-white rounded text-xs">
                    Save
                  </button>
                  <button onClick={() => setEditingAlt(null)} className="px-2 py-1 text-gray-400 text-xs">
                    Cancel
                  </button>
                </div>
              ) : (
                <p className="mt-1 text-xs text-gray-500 truncate">
                  {m.alt || <span className="italic">No alt text</span>}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                <span>{formatFileSize(m.size_bytes)}</span>
                {m.width && m.height && <span>{m.width}×{m.height}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
