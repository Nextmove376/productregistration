'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Inbox,
  Eye,
  Mail,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Save,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { api, ApiError } from '@/lib/client-api';
import { MediaToast, createToast, type ToastMessage } from '@/components/admin/MediaToast';

interface Submission {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  service: string;
  message: string;
  source_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  status: string;
  notes: string | null;
  mail_status: string;
  mail_error: string | null;
  created_at: string;
}

const STATUSES = ['all', 'new', 'contacted', 'qualified', 'won', 'lost'] as const;

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 ring-blue-200',
  contacted: 'bg-amber-50 text-amber-700 ring-amber-200',
  qualified: 'bg-violet-50 text-violet-700 ring-violet-200',
  won: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  lost: 'bg-gray-100 text-gray-600 ring-gray-200',
};

const MAIL_STYLES: Record<string, string> = {
  sent: 'text-emerald-600',
  pending: 'text-amber-600',
  failed: 'text-red-600',
};

export default function SubmissionsClient() {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
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

  /** Server-side filter + pagination, so counts reflect the whole table. */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status !== 'all') params.set('status', status);
      if (search) params.set('q', search);

      const data = await api.get(`/api/admin/submissions?${params}`);
      setSubs(data.data ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
      setCounts(data.counts ?? {});
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, [page, status, search, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Sends only `{ status }`.
   *
   * That used to silently wipe the lead's notes, because the API wrote
   * `notes = body.notes || null` regardless of whether `notes` was in the payload.
   * The endpoint now performs a genuine partial update.
   */
  const updateStatus = async (sub: Submission, next: string) => {
    setBusyId(sub.id);
    try {
      await api.put(`/api/admin/submissions/${sub.id}`, { status: next });
      setSubs((prev) => prev.map((s) => (s.id === sub.id ? { ...s, status: next } : s)));
      setSelected((prev) => (prev && prev.id === sub.id ? { ...prev, status: next } : prev));
      // Refresh the tab counts.
      setCounts((prev) => ({
        ...prev,
        [sub.status]: Math.max(0, (prev[sub.status] ?? 1) - 1),
        [next]: (prev[next] ?? 0) + 1,
      }));
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Could not update status');
    } finally {
      setBusyId(null);
    }
  };

  const saveNotes = async (sub: Submission, notes: string) => {
    setBusyId(sub.id);
    try {
      await api.put(`/api/admin/submissions/${sub.id}`, { notes });
      setSubs((prev) => prev.map((s) => (s.id === sub.id ? { ...s, notes } : s)));
      setSelected((prev) => (prev && prev.id === sub.id ? { ...prev, notes } : prev));
      addToast('success', 'Notes saved');
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Could not save notes');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (sub: Submission) => {
    if (!confirm(`Move the enquiry from ${sub.name} to trash?`)) return;
    setBusyId(sub.id);
    try {
      await api.delete(`/api/admin/submissions/${sub.id}`);
      setSubs((prev) => prev.filter((s) => s.id !== sub.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setSelected(null);
      addToast('success', 'Enquiry moved to trash');
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <MediaToast toasts={toasts} onDismiss={dismissToast} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
        <p className="mt-1 text-sm text-gray-500">{total} enquiry(ies) matching the current filter</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
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
              {f !== 'all' && counts[f] !== undefined && (
                <span className={`ml-1.5 text-xs ${status === f ? 'text-white/70' : 'text-gray-400'}`}>
                  {counts[f]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative sm:ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, email, company…"
            className="w-64 rounded-xl border border-gray-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10"
            aria-label="Search submissions"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-4">
                <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : subs.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              {search || status !== 'all' ? 'No enquiries match these filters' : 'No submissions yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Service</th>
                  <th className="px-6 py-3">Status</th>
                  {/* Was headed "Email" while showing mail_status. */}
                  <th className="px-6 py-3">Mail status</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subs.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{s.service}</td>
                    <td className="px-6 py-4">
                      <select
                        value={s.status}
                        disabled={busyId === s.id}
                        onChange={(e) => updateStatus(s, e.target.value)}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs disabled:opacity-50"
                        aria-label={`Status for ${s.name}`}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`flex items-center gap-1.5 ${MAIL_STYLES[s.mail_status] ?? 'text-gray-500'}`}>
                        <Mail className="h-3.5 w-3.5" />
                        {s.mail_status}
                        {s.mail_status === 'failed' && s.mail_error && (
                          <span title={s.mail_error}>
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setSelected(s)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          disabled={busyId === s.id}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Move to trash"
                        >
                          {busyId === s.id ? (
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

      {selected && (
        <SubmissionDetail
          submission={selected}
          busy={busyId === selected.id}
          onClose={() => setSelected(null)}
          onSaveNotes={(notes) => saveNotes(selected, notes)}
        />
      )}
    </div>
  );
}

/** Accessible detail dialog: Escape to close, focus trapped, background scroll locked. */
function SubmissionDetail({
  submission,
  busy,
  onClose,
  onSaveNotes,
}: {
  submission: Submission;
  busy: boolean;
  onClose: () => void;
  onSaveNotes: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(submission.notes ?? '');
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setNotes(submission.notes ?? '');
  }, [submission.id, submission.notes]);

  useEffect(() => {
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const meta: [string, string | null][] = [
    ['Phone', submission.phone],
    ['Company', submission.company],
    ['Service', submission.service],
    ['Location', [submission.city, submission.country].filter(Boolean).join(', ') || null],
    ['Device', [submission.device, submission.browser].filter(Boolean).join(' · ') || null],
    ['Source page', submission.source_page],
    ['Referrer', submission.referrer],
    ['Campaign', [submission.utm_source, submission.utm_medium, submission.utm_campaign].filter(Boolean).join(' / ') || null],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Enquiry from ${submission.name}`}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        ref={dialogRef}
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-gray-100 p-6">
          <div>
            <h2 className="text-lg font-bold">{submission.name}</h2>
            <p className="mt-1 text-sm text-gray-500">
              <a href={`mailto:${submission.email}`} className="hover:underline">
                {submission.email}
              </a>
            </p>
            <p className="mt-1 text-xs text-gray-400">{new Date(submission.created_at).toLocaleString()}</p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {meta
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs uppercase tracking-wider text-gray-400">{label}</dt>
                  <dd className="break-words text-sm text-gray-900">{value}</dd>
                </div>
              ))}
          </dl>

          <div>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-gray-400">Message</h3>
            <div className="whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm text-gray-900">
              {submission.message}
            </div>
          </div>

          {submission.mail_status === 'failed' && submission.mail_error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-700">
                <AlertTriangle className="h-3.5 w-3.5" /> Mail delivery failed
              </h3>
              <p className="break-words text-xs text-red-700">{submission.mail_error}</p>
            </div>
          )}

          <div>
            <label htmlFor="notes" className="mb-2 block text-xs uppercase tracking-wider text-gray-400">
              Internal notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={10000}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10"
              placeholder="Call notes, next steps…"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 p-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={() => onSaveNotes(notes)}
            disabled={busy || notes === (submission.notes ?? '')}
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save notes
          </button>
        </div>
      </div>
    </div>
  );
}
