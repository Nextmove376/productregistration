'use client';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Upload,
  Copy,
  Trash2,
  Check,
  Search,
  Image as ImageIcon,
  Edit2,
  X,
  ChevronLeft,
  ChevronRight,
  Film,
  Loader2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { MediaToast, createToast, type ToastMessage } from '@/components/admin/MediaToast';
import { api, apiRequest, ApiError } from '@/lib/client-api';
import { CSRF_HEADER_NAME } from '@/lib/csrf-constants';

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
  deleted_at: string | null;
}

interface Reference {
  type: string;
  id: number | string;
  title: string;
  field: string;
}

const MEDIA_ENDPOINT = '/api/admin/media';

/**
 * The media library screen.
 *
 * This lives here rather than in `app/admin/(protected)/media/page.tsx` because it
 * is a Client Component, and a client page can neither call the server-only DAL
 * nor export route-segment config. It was the one protected screen with no auth
 * guard of its own, relying entirely on the layout — which the layout's own
 * docblock warns is not sufficient, since layouts do not re-run on client-side
 * navigation. The page file is now a thin authenticated Server Component that
 * renders this, matching `blog/page.tsx` → `BlogListClient`.
 */
export default function MediaLibraryClient() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [copied, setCopied] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showTrash, setShowTrash] = useState(false);
  const [editingAlt, setEditingAlt] = useState<number | null>(null);
  const [altText, setAltText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [blocked, setBlocked] = useState<{ ids: number[]; references: Reference[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    setToasts((prev) => [...prev, createToast(type, message)]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Debounce the search box — it previously refetched on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(
        `${MEDIA_ENDPOINT}?page=${page}&limit=20&search=${encodeURIComponent(search)}&trashed=${showTrash}`
      );
      setMedia(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setSelectedIds(new Set());
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Failed to load media library');
    } finally {
      setLoading(false);
    }
  }, [page, search, showTrash, addToast]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  /**
   * Revoke the object URLs when the previews change or the component unmounts.
   * Without this every file selection leaked a blob for the page's lifetime.
   */
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files).slice(0, 5);
    setPreviewUrls((old) => {
      old.forEach((url) => URL.revokeObjectURL(url));
      return fileArray.map((file) => URL.createObjectURL(file));
    });
    setSelectedFiles(fileArray);
  };

  const clearSelection = () => {
    setPreviewUrls((old) => {
      old.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
    setSelectedFiles([]);
  };

  const readCsrf = () => {
    const match = document.cookie
      .split(';')
      .map((p) => p.trim())
      .find((p) => p.startsWith('nm_csrf='));
    return match ? decodeURIComponent(match.slice('nm_csrf='.length)) : null;
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    setToasts((prev) => prev.filter((t) => t.type !== 'success'));

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('file', file);
      formData.append('alt', '');
    });

    try {
      // XHR rather than fetch, because it reports upload progress.
      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        });

        xhr.addEventListener('load', () => {
          // Parse defensively: a proxy error page is not JSON.
          let parsed: any = null;
          try {
            parsed = JSON.parse(xhr.responseText);
          } catch {
            /* non-JSON body */
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(parsed ?? {});
          } else {
            reject(
              new ApiError(
                parsed?.error || `Upload failed with status ${xhr.status}`,
                xhr.status,
                parsed?.code ?? 'UNKNOWN'
              )
            );
          }
        });

        xhr.addEventListener('error', () => reject(new ApiError('Network error during upload', 0, 'NETWORK')));
        xhr.addEventListener('timeout', () => reject(new ApiError('Upload timed out', 0, 'TIMEOUT')));

        xhr.open('POST', MEDIA_ENDPOINT);
        xhr.withCredentials = true;
        const csrf = readCsrf();
        if (csrf) xhr.setRequestHeader(CSRF_HEADER_NAME, csrf);
        xhr.send(formData);
      });

      if (result.errors?.length > 0) {
        result.errors.forEach((e: any) => addToast('error', `${e.filename}: ${e.error}`));
      }

      const count = result.uploaded || 0;
      if (count > 0) {
        addToast('success', `${count} file${count > 1 ? 's' : ''} uploaded successfully`);
        clearSelection();
        fetchMedia();
      }
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Upload failed');
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

  const copyUrl = async (path: string, id: number) => {
    // Was hardcoded to the production domain, so copied URLs were wrong in dev.
    const fullUrl = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      addToast('error', 'Could not copy to clipboard');
    }
  };

  /**
   * Delete via DELETE, falling back to the POST action envelope.
   *
   * `apiRequest`'s `fallback` retries as POST when the response is a 405 or a
   * non-JSON body — the signature of a proxy rejecting the verb before the request
   * ever reaches the app.
   */
  const runDelete = async (ids: number[], opts: { force?: boolean; purge?: boolean } = {}) => {
    const { force = false, purge = false } = opts;
    setDeletingIds((prev) => new Set([...prev, ...ids]));

    try {
      if (ids.length === 1) {
        const qs = new URLSearchParams();
        if (force) qs.set('force', 'true');
        if (purge) qs.set('purge', 'true');
        const suffix = qs.toString() ? `?${qs}` : '';

        await apiRequest(`${MEDIA_ENDPOINT}/${ids[0]}${suffix}`, {
          method: 'DELETE',
          fallback: { url: MEDIA_ENDPOINT, body: { action: 'delete', ids, force, purge } },
        });
      } else {
        await api.post(MEDIA_ENDPOINT, { action: 'delete', ids, force, purge });
      }

      setMedia((prev) => prev.filter((m) => !ids.includes(m.id)));
      setTotal((prev) => Math.max(0, prev - ids.length));
      setSelectedIds(new Set());
      setBlocked(null);
      addToast(
        'success',
        purge
          ? `${ids.length} file${ids.length > 1 ? 's' : ''} permanently deleted`
          : `${ids.length} file${ids.length > 1 ? 's' : ''} moved to trash`
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Surface exactly which content is using the file, with a force option.
        const details = err.details as any;
        setBlocked({ ids, references: details?.references ?? [] });
      } else {
        addToast('error', err instanceof ApiError ? err.message : 'Delete failed');
      }
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const handleDelete = (id: number) => {
    const purge = showTrash;
    const label = purge
      ? 'Permanently delete this file? The file will be removed from disk and cannot be recovered.'
      : 'Move this file to trash? You can restore it later.';
    if (!confirm(label)) return;
    runDelete([id], { purge });
  };

  const handleBulkDelete = () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const purge = showTrash;
    const label = purge
      ? `Permanently delete ${ids.length} file(s)? This cannot be undone.`
      : `Move ${ids.length} file(s) to trash?`;
    if (!confirm(label)) return;
    runDelete(ids, { purge });
  };

  const handleRestore = async (ids: number[]) => {
    try {
      await api.post(MEDIA_ENDPOINT, { action: 'restore', ids });
      setMedia((prev) => prev.filter((m) => !ids.includes(m.id)));
      setTotal((prev) => Math.max(0, prev - ids.length));
      setSelectedIds(new Set());
      addToast('success', `${ids.length} file${ids.length > 1 ? 's' : ''} restored`);
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Restore failed');
    }
  };

  const updateAltText = async (id: number) => {
    try {
      const updated = await apiRequest(`${MEDIA_ENDPOINT}/${id}`, {
        method: 'PATCH',
        body: { alt: altText },
        // PATCH is blocked by some proxies just like DELETE.
        fallback: { url: MEDIA_ENDPOINT, body: { action: 'update', id, alt: altText } },
      });
      setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, alt: updated?.alt ?? altText } : m)));
      setEditingAlt(null);
      addToast('success', 'Alt text updated');
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Failed to update alt text');
    }
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = media.length > 0 && media.every((m) => selectedIds.has(m.id));
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(media.map((m) => m.id)));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isVideo = (mimeType: string) => mimeType?.startsWith('video/');

  const blockedTitles = useMemo(
    () => (blocked?.references ?? []).map((r) => `${r.type} "${r.title}" (${r.field})`),
    [blocked]
  );

  return (
    <div>
      <MediaToast toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} {showTrash ? 'file(s) in trash' : 'file(s)'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search files..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="rounded-xl border border-gray-200 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              aria-label="Search media files"
            />
          </div>
          <button
            onClick={() => {
              setShowTrash((v) => !v);
              setPage(1);
            }}
            className={`rounded-xl border px-4 py-2.5 text-sm font-medium ${
              showTrash
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {showTrash ? 'Viewing trash' : 'Trash'}
          </button>
          {!showTrash && (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" /> Upload
            </button>
          )}
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

      {/* Reference conflict — replaces the old "Add ?force=true" instruction */}
      {blocked && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-900">This file is still in use</h3>
          </div>
          <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-amber-800">
            {blockedTitles.length > 0 ? (
              blockedTitles.map((t) => <li key={t}>{t}</li>)
            ) : (
              <li>Referenced by other content</li>
            )}
          </ul>
          <div className="flex gap-3">
            <button
              onClick={() => runDelete(blocked.ids, { force: true, purge: showTrash })}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Delete anyway
            </button>
            <button
              onClick={() => setBlocked(null)}
              className="rounded-xl border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {media.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4 rounded" />
            Select all
          </label>
          <span className="text-sm text-gray-400">{selectedIds.size} selected</span>
          {selectedIds.size > 0 && (
            <div className="ml-auto flex gap-2">
              {showTrash && (
                <button
                  onClick={() => handleRestore([...selectedIds])}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restore
                </button>
              )}
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" /> {showTrash ? 'Delete permanently' : 'Move to trash'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload preview */}
      {selectedFiles.length > 0 && (
        <div className="mb-6 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium text-blue-900">Selected Files ({selectedFiles.length})</h3>
            <button onClick={clearSelection} className="text-blue-400 hover:text-blue-600" aria-label="Clear selection">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {previewUrls.map((url, i) => (
              <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-gray-200">
                {selectedFiles[i]?.type?.startsWith('video/') ? (
                  <div className="flex h-full w-full items-center justify-center bg-gray-800">
                    <Film className="h-8 w-8 text-gray-400" />
                  </div>
                ) : (
                  <img src={url} alt="" className="h-full w-full object-cover" />
                )}
                <div className="absolute bottom-0 left-0 right-0 truncate bg-black/60 p-2 text-xs text-white">
                  {selectedFiles[i]?.name}
                </div>
              </div>
            ))}
          </div>

          {uploading && (
            <div className="mb-4">
              <div className="mb-1 flex justify-between text-sm text-blue-700">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-blue-200">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={clearSelection} className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800">
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Upload {selectedFiles.length} file
                  {selectedFiles.length > 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Drag & drop zone */}
      {!showTrash && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`mb-6 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
            dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
          }`}
        >
          <ImageIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-sm text-gray-600">
            Drag and drop images or videos here, or{' '}
            <button
              onClick={() => inputRef.current?.click()}
              className="font-medium text-blue-600 hover:underline"
            >
              browse files
            </button>
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Supports: JPG, PNG, WebP, SVG, GIF, MP4, WebM, OGG (max 10MB each)
          </p>
        </div>
      )}

      {/* Media grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="aspect-square animate-pulse bg-gray-100" />
              <div className="space-y-2 p-3">
                <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))
        ) : media.length === 0 ? (
          <div className="col-span-full p-12 text-center">
            <ImageIcon className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              {search
                ? 'No files match your search'
                : showTrash
                  ? 'Trash is empty'
                  : 'No media files uploaded yet'}
            </p>
          </div>
        ) : (
          media.map((m) => (
            <div
              key={m.id}
              className={`group overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-md ${
                selectedIds.has(m.id) ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200'
              }`}
            >
              <div className="relative aspect-square bg-gray-100">
                <label className="absolute left-2 top-2 z-10 flex cursor-pointer items-center rounded bg-white/90 p-1.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(m.id)}
                    onChange={() => toggleSelected(m.id)}
                    className="h-4 w-4 rounded"
                    aria-label={`Select ${m.filename}`}
                  />
                </label>

                {isVideo(m.mime_type) ? (
                  <div className="flex h-full w-full items-center justify-center bg-gray-800">
                    <Film className="h-12 w-12 text-gray-500" />
                  </div>
                ) : (
                  <img
                    src={m.thumbnail_path || m.path}
                    alt={m.alt || m.filename}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%239ca3af" font-size="12">Not found</text></svg>';
                    }}
                  />
                )}

                <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-colors group-hover:bg-black/40 group-hover:opacity-100">
                  <div className="flex gap-2">
                    {showTrash ? (
                      <button
                        onClick={() => handleRestore([m.id])}
                        className="rounded-lg bg-white/90 p-2 text-gray-700 hover:bg-white"
                        title="Restore"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => copyUrl(m.path, m.id)}
                          className="rounded-lg bg-white/90 p-2 text-gray-700 hover:bg-white"
                          title="Copy URL"
                        >
                          {copied === m.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingAlt(m.id);
                            setAltText(m.alt);
                          }}
                          className="rounded-lg bg-white/90 p-2 text-gray-700 hover:bg-white"
                          title="Edit alt text"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={deletingIds.has(m.id)}
                      className="rounded-lg bg-white/90 p-2 text-red-600 hover:bg-white disabled:opacity-50"
                      title={showTrash ? 'Delete permanently' : 'Move to trash'}
                    >
                      {deletingIds.has(m.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3">
                <p className="truncate text-xs font-medium text-gray-900" title={m.filename}>
                  {m.filename}
                </p>
                {editingAlt === m.id ? (
                  <div className="mt-2 flex gap-1">
                    <input
                      type="text"
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') updateAltText(m.id);
                        if (e.key === 'Escape') setEditingAlt(null);
                      }}
                      className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-900/20"
                      placeholder="Alt text for SEO..."
                      autoFocus
                      maxLength={300}
                    />
                    <button
                      onClick={() => updateAltText(m.id)}
                      className="rounded bg-gray-900 px-2 py-1 text-xs text-white hover:bg-gray-800"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingAlt(null)}
                      className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {m.alt || <span className="italic text-amber-600">No alt text</span>}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                  <span>{formatFileSize(m.size_bytes)}</span>
                  <div className="flex items-center gap-2">
                    {isVideo(m.mime_type) && <Film className="h-3 w-3" />}
                    {m.width && m.height && (
                      <span>
                        {m.width}&times;{m.height}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 disabled:opacity-50"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 disabled:opacity-50"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
