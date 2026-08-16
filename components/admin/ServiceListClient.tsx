'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Package, Loader2, Eye } from 'lucide-react';
import { api, ApiError } from '@/lib/client-api';
import { MediaToast, createToast, type ToastMessage } from '@/components/admin/MediaToast';

interface Service {
  id: number;
  title: string;
  slug: string;
  tag: string | null;
  is_active: number;
  sort_order: number;
}

export default function ServiceListClient() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
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
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

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

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="mt-1 text-sm text-gray-500">{services.length} service(s)</p>
        </div>
        <Link
          href="/admin/services/new"
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" /> Add Service
        </Link>
      </div>

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
            <p className="text-sm text-gray-500">No services yet</p>
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
                      <p className="font-medium">{s.title}</p>
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
