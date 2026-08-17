'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Loader2,
  Eye,
  AlertTriangle,
  Download,
  Stethoscope,
} from 'lucide-react';
import { api, ApiError } from '@/lib/client-api';
import { MediaToast, createToast, type ToastMessage } from '@/components/admin/MediaToast';

interface Service {
  id: number;
  title: string;
  slug: string;
  tag: string | null;
  is_active: number;
  sort_order: number;
  /** True when a built-in page exists at `/services/<slug>`. */
  has_page?: boolean;
}

export default function ServiceListClient() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    setToasts((prev) => [...prev, createToast(type, message)]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Reads the authenticated admin endpoint, not the public `/api/services`.
   *
   * The public route filters to `is_active = 1` and doesn't select `is_active` at
   * all, so this list previously hid every inactive service and its "Active" column
   * rendered from an undefined field — always showing "No".
   */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/admin/services');
      setServices(Array.isArray(data) ? data : (data.data ?? []));
      setLoadError('');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load services';
      // Kept on screen rather than only in a toast: the message now carries the real
      // database error, which is the one thing needed to act on it.
      setLoadError(message);
      addToast('error', message);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Copies the six built-in service pages into the database.
   *
   * The pages at `/services/product-registration`, `/services/mohap-registration` and
   * so on are static routes, so they were never rows — which is why this screen could
   * be empty while the live site showed six services. Importing them makes their
   * titles, tags, summaries, hero images and "Our service" content editable here.
   */
  const importPages = async () => {
    setImporting(true);
    try {
      const res = await api.post<{ seeded: string[] }>('/api/admin/schema', { action: 'seed-services' });
      addToast(
        'success',
        res.seeded.length === 0
          ? 'All service pages are already listed.'
          : `Imported ${res.seeded.length} page(s).`
      );
      await load();
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`Move "${service.title}" to trash? You can restore it later.`)) return;

    setDeletingId(service.id);
    try {
      await api.delete(`/api/admin/services/${service.id}`);
      setServices((prev) => prev.filter((s) => s.id !== service.id));
      addToast('success', `"${service.title}" moved to trash`);
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <MediaToast toasts={toasts} onDismiss={dismissToast} />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="mt-1 text-sm text-gray-500">{services.length} service(s)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={importPages}
            disabled={importing}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            title="Add the built-in service pages to this list so they can be edited"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Import existing pages
          </button>
          <Link
            href="/admin/services/new"
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" /> Add Service
          </Link>
        </div>
      </div>

      {loadError ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="font-medium text-gray-900">Services could not be loaded</p>
              <p className="mt-1 break-words font-mono text-xs text-amber-800">{loadError}</p>
              <p className="mt-2 text-sm text-gray-600">
                This is almost always the live database missing a column the code expects.
                Diagnostics will name it and repair it.
              </p>
              <Link
                href="/admin/diagnostics"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                <Stethoscope className="h-4 w-4" /> Open diagnostics
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-1/5 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">No services listed yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
              The six service pages on the live site are built-in routes, so they are not database
              rows until you import them. Import once and they become fully editable here.
            </p>
            <button
              onClick={importPages}
              disabled={importing}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Import existing pages
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Tag</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Order</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{s.title}</p>
                        {s.has_page ? (
                          <span
                            className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200"
                            title="A built-in page exists for this slug. Edits here override its title, tag, summary, hero and content."
                          >
                            Built-in page
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-gray-400">/services/{s.slug}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{s.tag || '—'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                          s.is_active
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : 'bg-gray-100 text-gray-600 ring-gray-200'
                        }`}
                      >
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{s.sort_order}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        {s.is_active ? (
                          <a
                            href={`/services/${s.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                            title="View on site"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        ) : null}
                        <Link
                          href={`/admin/services/${s.id}/edit`}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(s)}
                          disabled={deletingId === s.id}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Move to trash"
                        >
                          {deletingId === s.id ? (
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
    </div>
  );
}
