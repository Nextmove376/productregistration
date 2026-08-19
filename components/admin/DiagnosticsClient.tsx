'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  Loader2,
  RefreshCw,
  Wrench,
  XCircle,
} from 'lucide-react';
import { api, ApiError } from '@/lib/client-api';
import { MediaToast, createToast, type ToastMessage } from '@/components/admin/MediaToast';

interface SchemaReport {
  database: string;
  connected: boolean;
  missingTables: string[];
  missingColumns: string[];
  missingIndexes: string[];
  rowCounts: Record<string, number>;
  probes: { name: string; ok: boolean; error?: string }[];
  uploads?: {
    dir: string;
    cwd: string;
    exists: boolean;
    writable: boolean;
    fileCount: number;
    insideBuildOutput: boolean;
    error?: string;
  };
  settings?: {
    columns: string[];
    keyColumn: string | null;
    valueColumn: string | null;
    typeColumn: string | null;
    legacyKeyColumn: string | null;
  };
  error?: string;
}

interface RepairResult {
  applied: string[];
  failed: { statement: string; error: string }[];
  report?: SchemaReport;
}

/**
 * Reads `/api/admin/schema` and renders the drift.
 *
 * The four broken admin screens ("Could not load services", "Could not load the team",
 * "Could not load analytics", "Could not save settings") all had one cause: the live
 * database predates columns the code needs, and `CREATE TABLE IF NOT EXISTS` never adds
 * columns to a table that already exists. The probe list below runs those exact queries
 * so the failure names itself, and "Repair database" applies the guarded DDL that fixes
 * it — every statement independent, so one impossible step cannot halt the rest.
 */
export default function DiagnosticsClient() {
  const [report, setReport] = useState<SchemaReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'repair' | 'seed' | null>(null);
  const [result, setResult] = useState<RepairResult | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    setToasts((prev) => [...prev, createToast(type, message)]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await api.get<SchemaReport>('/api/admin/schema'));
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Could not inspect the database');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const runRepair = async () => {
    setBusy('repair');
    setResult(null);
    try {
      const res = await api.post<RepairResult>('/api/admin/schema', { action: 'repair' });
      setResult(res);
      if (res.report) setReport(res.report);
      addToast(
        'success',
        res.applied.length === 0
          ? 'Nothing to change — the database already matches the code.'
          : `Applied ${res.applied.length} change(s)${res.failed.length ? `, skipped ${res.failed.length}` : ''}.`
      );
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Repair failed');
    } finally {
      setBusy(null);
    }
  };

  const runSeed = async () => {
    setBusy('seed');
    try {
      const res = await api.post<{ seeded: string[] }>('/api/admin/schema', { action: 'seed-services' });
      addToast(
        'success',
        res.seeded.length === 0
          ? 'All service pages are already in the database.'
          : `Imported ${res.seeded.length} service page(s): ${res.seeded.join(', ')}`
      );
      load();
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Import failed');
    } finally {
      setBusy(null);
    }
  };

  const failingProbes = report?.probes.filter((p) => !p.ok) ?? [];
  const driftCount =
    (report?.missingTables.length ?? 0) +
    (report?.missingColumns.length ?? 0) +
    (report?.missingIndexes.length ?? 0);
  const healthy = Boolean(report?.connected) && driftCount === 0 && failingProbes.length === 0;

  return (
    <div>
      <MediaToast toasts={toasts} onDismiss={dismissToast} />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Diagnostics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Compares the live database against what the code expects.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={load}
            disabled={loading || busy !== null}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Re-check
          </button>
          <button
            onClick={runSeed}
            disabled={busy !== null}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === 'seed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Import service pages
          </button>
          <button
            onClick={runRepair}
            disabled={busy !== null}
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {busy === 'repair' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
            Repair database
          </button>
        </div>
      </div>

      {loading && !report ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : !report ? null : (
        <div className="space-y-4">
          {/* Headline */}
          <div
            className={`flex items-start gap-3 rounded-2xl border p-5 ${
              healthy
                ? 'border-emerald-200 bg-emerald-50'
                : report.connected
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-red-200 bg-red-50'
            }`}
          >
            {healthy ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle
                className={`mt-0.5 h-5 w-5 shrink-0 ${report.connected ? 'text-amber-600' : 'text-red-600'}`}
              />
            )}
            <div className="min-w-0">
              <p className="font-medium text-gray-900">
                {!report.connected
                  ? 'Cannot reach the database'
                  : healthy
                    ? 'The database matches the code'
                    : `${driftCount} schema difference(s) and ${failingProbes.length} failing quer${failingProbes.length === 1 ? 'y' : 'ies'}`}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {!report.connected
                  ? report.error
                  : healthy
                    ? `Connected to ${report.database}. Every admin query ran successfully.`
                    : 'Click “Repair database” — each change is applied independently and is safe to run more than once.'}
              </p>
            </div>
          </div>

          {/* Live probes — the queries the admin screens actually run */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <header className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
              <Database className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">Admin queries</h2>
            </header>
            <ul className="divide-y divide-gray-100">
              {report.probes.map((probe) => (
                <li key={probe.name} className="flex items-start gap-3 px-6 py-3">
                  {probe.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{probe.name}</p>
                    {probe.error ? (
                      <p className="mt-0.5 break-words font-mono text-xs text-red-600">{probe.error}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Drift detail */}
          <div className="grid gap-4 lg:grid-cols-3">
            <DriftCard title="Missing tables" items={report.missingTables} />
            <DriftCard title="Missing columns" items={report.missingColumns} />
            <DriftCard title="Missing indexes" items={report.missingIndexes} />
          </div>

          {/*
            The settings table has caused two separate production incidents on its own —
            errno 1072 when indexing a `key` column that did not exist, then
            ER_DUP_ENTRY on a string primary key under a name this codebase never used.
            Both took a phpMyAdmin round trip to identify. Printing the real column list
            here makes the next one self-evident.
          */}
          {report.settings ? (
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <header className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-sm font-semibold text-gray-900">Settings table shape</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Resolved at runtime, so a table older than this code still reads and writes.
                </p>
              </header>
              <dl className="grid gap-px bg-gray-100 sm:grid-cols-2">
                <ShapeRow label="Key column" value={report.settings.keyColumn} required />
                <ShapeRow label="Value column" value={report.settings.valueColumn} required />
                <ShapeRow label="Type column" value={report.settings.typeColumn} />
                <ShapeRow label="Legacy primary key" value={report.settings.legacyKeyColumn} />
              </dl>
              <div className="border-t border-gray-100 px-6 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  All columns ({report.settings.columns.length})
                </p>
                <p className="mt-1 break-words font-mono text-xs text-gray-600">
                  {report.settings.columns.join(', ') || 'table not found'}
                </p>
              </div>
            </section>
          ) : null}

          {/*
            Uploads location.
            Broken images across the whole site traced back to this one value: with
            `output: 'standalone'` Next's server.js chdirs into `.next/standalone`, so
            uploads were being written inside build output and deleted by every deploy.
            Printing the resolved path turns that from invisible to obvious.
          */}
          {report.uploads ? (
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <header className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-sm font-semibold text-gray-900">Uploads directory</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Where <code className="font-mono">/api/media/…</code> reads and writes files.
                </p>
              </header>

              {report.uploads.insideBuildOutput ? (
                <p className="border-b border-red-100 bg-red-50 px-6 py-3 text-xs text-red-700">
                  <strong>This path is inside <code className="font-mono">.next/</code>.</strong>{' '}
                  That directory is rebuilt on every deploy, so every uploaded file will be
                  deleted the next time the app is built. Set{' '}
                  <code className="font-mono">UPLOAD_DIR_OVERRIDE</code> to a path outside the
                  project.
                </p>
              ) : null}

              <dl className="grid gap-px bg-gray-100 sm:grid-cols-2">
                <ShapeRow label="Resolved path" value={report.uploads.dir} required />
                <ShapeRow label="Working directory" value={report.uploads.cwd} />
                <ShapeRow
                  label="Directory exists"
                  value={report.uploads.exists ? 'yes' : 'no — nothing can be served'}
                  required
                />
                <ShapeRow
                  label="Writable"
                  value={report.uploads.writable ? 'yes' : 'no — uploads will fail'}
                  required
                />
                <ShapeRow label="Files present" value={String(report.uploads.fileCount)} />
                {report.uploads.error ? (
                  <ShapeRow label="Read error" value={report.uploads.error} />
                ) : null}
              </dl>
            </section>
          ) : null}

          {/* Row counts */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <header className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Row counts</h2>
            </header>
            <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
              {Object.entries(report.rowCounts).map(([table, count]) => (
                <div key={table} className="bg-white px-6 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">{table}</p>
                  <p className={`mt-1 text-lg font-semibold ${count < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {count < 0 ? 'unreadable' : count}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* What the last repair did */}
          {result ? (
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <header className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-sm font-semibold text-gray-900">Last repair</h2>
              </header>
              <div className="space-y-4 px-6 py-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Applied ({result.applied.length})
                  </p>
                  <p className="mt-1 break-words font-mono text-xs text-gray-600">
                    {result.applied.length ? result.applied.join(' · ') : 'nothing to do'}
                  </p>
                </div>
                {result.failed.length ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Skipped ({result.failed.length})
                    </p>
                    <ul className="mt-1 space-y-1">
                      {result.failed.map((f) => (
                        <li key={f.statement} className="break-words font-mono text-xs text-amber-700">
                          {f.statement} — {f.error}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-gray-500">
                      Skipped steps are usually harmless: a key that already exists under another
                      name, or a unique index blocked by duplicate rows.
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ShapeRow({
  label,
  value,
  required = false,
}: {
  label: string;
  value: string | null;
  required?: boolean;
}) {
  return (
    <div className="bg-white px-6 py-3">
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd
        className={`mt-0.5 font-mono text-sm ${
          value ? 'text-gray-900' : required ? 'text-red-600' : 'text-gray-400'
        }`}
      >
        {value ?? (required ? 'not found — run Repair' : 'none')}
      </dd>
    </div>
  );
}

function DriftCard({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
            items.length
              ? 'bg-amber-50 text-amber-700 ring-amber-200'
              : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          }`}
        >
          {items.length}
        </span>
      </div>
      {items.length ? (
        <ul className="mt-3 space-y-1">
          {items.map((item) => (
            <li key={item} className="break-words font-mono text-xs text-gray-600">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-gray-400">All present.</p>
      )}
    </section>
  );
}
