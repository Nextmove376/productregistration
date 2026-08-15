'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Upload, Copy, Trash2, Check, Search, Image as ImageIcon, Edit2, X, ChevronLeft, ChevronRight, Film, Loader2 } from 'lucide-react';
import { MediaToast, createToast, type ToastMessage } from '@/components/admin/MediaToast';

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [copied, setCopied] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingAlt, setEditingAlt] = useState<number | null>(null);
  const [altText, setAltText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    setToasts(prev => [...prev, createToast(type, message)]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/media?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMedia(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch media:', err);
      addToast('error', 'Failed to load media library');
    }
    setLoading(false);
  }, [page, search, addToast]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files).slice(0, 5);
    setSelectedFiles(fileArray);
    const urls = fileArray.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    setToasts(prev => prev.filter(t => t.type !== 'success'));

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('file', file);
      formData.append('alt', '');
    });

    try {
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<any>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error || 'Upload failed'));
            } catch {
              reject(new Error('Upload failed'));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.open('POST', '/api/admin/media');
        xhr.send(formData);
      });

      const result = await uploadPromise;
      
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((e: any) => {
          addToast('error', `${e.filename}: ${e.error}`);
        });
      }

      const count = result.uploaded || 0;
      if (count > 0) {
        addToast('success', `${count} file${count > 1 ? 's' : ''} uploaded successfully`);
        setSelectedFiles([]);
        setPreviewUrls([]);
        fetchMedia();
      }
    } catch (err: any) {
      addToast('error', err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files);
  };

  const copyUrl = (path: string, id: number) => {
    const fullUrl = `https://productregistrationinuae.com${path}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this media file? This action cannot be undone.')) return;
    
    setDeletingIds(prev => new Set(prev).add(id));
    
    try {
      const res = await fetch(`/api/admin/media/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.references) {
          const refList = data.references.map((r: any) => r.title).join(', ');
          addToast('error', `Cannot delete: used by ${refList}. Add ?force=true to force delete.`);
        } else {
          addToast('error', data.error || 'Delete failed');
        }
        return;
      }

      // Only remove from state after confirmed server deletion
      setMedia(prev => prev.filter(m => m.id !== id));
      setTotal(prev => prev - 1);
      addToast('success', 'File deleted successfully');
    } catch (err) {
      addToast('error', 'Delete failed. Please try again.');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const updateAltText = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/media/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alt: altText }),
      });
      if (!res.ok) {
        const data = await res.json();
        addToast('error', data.error || 'Failed to update alt text');
        return;
      }
      const updated = await res.json();
      setMedia(media.map(m => m.id === id ? { ...m, alt: updated.alt } : m));
      setEditingAlt(null);
      addToast('success', 'Alt text updated');
    } catch (err) {
      addToast('error', 'Failed to update alt text');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isVideo = (mimeType: string) => mimeType?.startsWith('video/');

  return (
    <div>
      <MediaToast toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
          <p className="text-sm text-gray-500 mt-1">{total} files</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" /> Upload
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/ogg"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </div>
      </div>

      {/* Upload Preview */}
      {selectedFiles.length > 0 && (
        <div className="mb-6 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-blue-900">Selected Files ({selectedFiles.length})</h3>
            <button onClick={() => { setSelectedFiles([]); setPreviewUrls([]); }} className="text-blue-400 hover:text-blue-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-4">
            {previewUrls.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-200">
                {selectedFiles[i]?.type?.startsWith('video/') ? (
                  <div className="h-full w-full flex items-center justify-center bg-gray-800">
                    <Film className="h-8 w-8 text-gray-400" />
                  </div>
                ) : (
                  <img src={url} alt="" className="h-full w-full object-cover" />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 truncate">
                  {selectedFiles[i].name}
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-blue-700 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={() => { setSelectedFiles([]); setPreviewUrls([]); }} className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800">
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Uploading {uploadProgress}%</>
              ) : (
                <><Upload className="h-4 w-4" /> Upload {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}</>
              )}
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
          Drag and drop images or videos here, or{' '}
          <button onClick={() => inputRef.current?.click()} className="text-blue-600 hover:underline font-medium">
            browse files
          </button>
        </p>
        <p className="text-xs text-gray-400 mt-2">Supports: JPG, PNG, WebP, SVG, GIF, MP4, WebM, OGG (max 10MB each)</p>
      </div>

      {/* Media Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {loading ? (
          <div className="col-span-full p-8 text-center text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading...
          </div>
        ) : media.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-400">
            {search ? 'No files match your search' : 'No media files uploaded yet'}
          </div>
        ) : media.map(m => (
          <div key={m.id} className="group rounded-2xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative aspect-square bg-gray-100">
              {isVideo(m.mime_type) ? (
                <div className="h-full w-full flex items-center justify-center bg-gray-800">
                  <Film className="h-12 w-12 text-gray-500" />
                </div>
              ) : (
                <img
                  src={m.thumbnail_path || m.path}
                  alt={m.alt || m.filename}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%239ca3af" font-size="12">Not found</text></svg>';
                  }}
                />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-2">
                  <button onClick={() => copyUrl(m.path, m.id)} className="rounded-lg bg-white/90 p-2 text-gray-700 hover:bg-white" title="Copy URL">
                    {copied === m.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button onClick={() => { setEditingAlt(m.id); setAltText(m.alt); }} className="rounded-lg bg-white/90 p-2 text-gray-700 hover:bg-white" title="Edit alt text">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    disabled={deletingIds.has(m.id)}
                    className="rounded-lg bg-white/90 p-2 text-red-600 hover:bg-white disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingIds.has(m.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
                    className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Alt text for SEO..."
                    autoFocus
                    maxLength={300}
                  />
                  <button onClick={() => updateAltText(m.id)} className="px-2 py-1 bg-gray-900 text-white rounded text-xs hover:bg-gray-800">Save</button>
                  <button onClick={() => setEditingAlt(null)} className="px-2 py-1 text-gray-400 text-xs hover:text-gray-600">Cancel</button>
                </div>
              ) : (
                <p className="mt-1 text-xs text-gray-500 truncate">
                  {m.alt || <span className="italic">No alt text</span>}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                <span>{formatFileSize(m.size_bytes)}</span>
                <div className="flex items-center gap-2">
                  {isVideo(m.mime_type) && <Film className="h-3 w-3" />}
                  {m.width && m.height && <span>{m.width}&times;{m.height}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

