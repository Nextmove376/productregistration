'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Loader2,
} from 'lucide-react';
import { api, ApiError } from '@/lib/client-api';
import { MediaToast, createToast, type ToastMessage } from '@/components/admin/MediaToast';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  created_at: string;
  views: number;
}

const STATUSES = ['all', 'draft', 'published', 'scheduled'] as const;
type StatusFilter = (typeof STATUSES)[number];

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  scheduled: 'bg-amber-50 text-amber-700 ring-amber-200',
  draft: 'bg-gray-100 text-gray-600 ring-gray-200',
};

export default function BlogListClient() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    setToasts((prev) => [...prev, createToast(type, message)]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  /**
   * Fetches from `/api/blog` **with a session**, so the response includes drafts
   * and the `status` column. Filtering and pagination happen server-side; the old
   * version pulled every post and filtered in the browser.
   */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status !== 'all') params.set('status', status);
      if (search) params.set('q', search);

      const data = await api.get(`/api/blog?${params}`);
      setPosts(data.data ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Failed to load posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [page, status, search, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Only mutates local state after the server confirms.
   *
   * The previous implementation removed the row from state immediately after
   * firing the request without checking `res.ok`, so a failed delete still made
   * the post disappear from the list until the next reload.
   */
  const handleDelete = async (post: BlogPost) => {
    if (!confirm(`Move "${post.title}" to trash? You can restore it from Trash later.`)) return;

    setDeletingId(post.id);
    try {
      await api.delete(`/api/blog/${post.id}`);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      setTotal((prev) => Math.max(0, prev - 1));
      addToast('success', `"${post.title}" moved to trash`);
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <MediaToast toasts={toasts} onDismiss={dismissToast} />

      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blog Posts</h1>
          <p className="mt-1 text-sm text-gray-500">{total} post(s)</p>
        </div>
        <Link
          href="/admin/blog/new"
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" /> New Post
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {STATUSES.map((f) => (
            <button
              key={f}
              onClick={() => {
                setStatus(f);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
                status === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* The Search icon was imported but no search UI existed. */}
        <div className="relative sm:ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search posts…"
            className="rounded-xl border border-gray-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10"
            aria-label="Search posts"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-1/4 animate-pulse rounded bg-gray-100" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              {search || status !== 'all' ? 'No posts match these filters' : 'No posts yet'}
            </p>
            {!search && status === 'all' && (
              <Link href="/admin/blog/new" className="mt-3 inline-block text-sm font-medium text-gray-900 underline">
                Write your first post
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Views</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium">{post.title}</p>
                      <p className="text-xs text-gray-400">/blog/{post.slug}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                          STATUS_STYLES[post.status] ?? STATUS_STYLES.draft
                        }`}
                      >
                        {post.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{post.views ?? 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(post.published_at || post.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        {post.status === 'published' && (
                          <a
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                            title="View on site"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        )}
                        <Link
                          href={`/admin/blog/${post.id}/edit`}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(post)}
                          disabled={deletingId === post.id}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Move to trash"
                        >
                          {deletingId === post.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
