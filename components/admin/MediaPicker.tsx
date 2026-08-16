'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, X, Loader2, Image as ImageIcon, Film, Check } from 'lucide-react';
import { api, ApiError } from '@/lib/client-api';

export interface PickableMedia {
  id: number;
  filename: string;
  path: string;
  thumbnail_path: string | null;
  alt: string;
  mime_type: string;
  width: number | null;
  height: number | null;
}

/**
 * Modal media browser, reusing the same `/api/admin/media` listing as the media
 * page. Previously image fields were free-text only, so editors had to copy URLs
 * by hand between the two screens.
 */
export default function MediaPicker({
  onSelect,
  onClose,
}: {
  onSelect: (item: PickableMedia) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<PickableMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get(
        `/api/admin/media?page=${page}&limit=24&search=${encodeURIComponent(search)}`
      );
      setItems(data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load media');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  // Escape closes, and the body must not scroll behind the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const chosen = items.find((i) => i.id === selected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Choose media">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center gap-3 border-b border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-900">Media library</h2>
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search…"
              className="rounded-xl border border-gray-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-gray-400"
              autoFocus
              aria-label="Search media"
            />
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          {loading ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <ImageIcon className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">{search ? 'No matches' : 'No media uploaded yet'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {items.map((item) => {
                const isVideo = item.mime_type?.startsWith('video/');
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item.id)}
                    onDoubleClick={() => onSelect(item)}
                    className={`group relative aspect-square overflow-hidden rounded-xl border-2 bg-gray-100 ${
                      selected === item.id ? 'border-gray-900' : 'border-transparent hover:border-gray-300'
                    }`}
                    title={item.filename}
                  >
                    {isVideo ? (
                      <div className="flex h-full w-full items-center justify-center bg-gray-800">
                        <Film className="h-6 w-6 text-gray-400" />
                      </div>
                    ) : (
                      <img
                        src={item.thumbnail_path || item.path}
                        alt={item.alt || item.filename}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    )}
                    {selected === item.id && (
                      <span className="absolute right-1 top-1 rounded-full bg-gray-900 p-1">
                        <Check className="h-3 w-3 text-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {totalPages > 1 && (
              <>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-50"
                >
                  Prev
                </button>
                <span>
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-50"
                >
                  Next
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {chosen && <span className="max-w-48 truncate text-xs text-gray-500">{chosen.filename}</span>}
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => chosen && onSelect(chosen)}
              disabled={!chosen}
              className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Use selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
