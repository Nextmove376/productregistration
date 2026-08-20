'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Database,
  Download,
  Loader2,
  RefreshCw,
  Type,
  Wrench,
  XCircle,
} from 'lucide-react';
import { api, apiDownload, ApiError } from '@/lib/client-api';
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

interface EncodingScan {
  /** Rows the scan would change. `updated` is present instead once a fix has run. */
  total?: number;
  updated?: number;
  tables: string[];
  samples: string[];
  skipped?: string[];
  scanned?: number;
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
  const [busy, setBusy] = useState<'repair' | 'seed' | 'backup' | 'scan' | 'encfix' | null>(null);
  const [result, setResult] = useState<RepairResult | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [encoding, setEncoding] = useState<EncodingScan | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    setToasts((prev) => [...prev, createToast(type, message)]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Fetches the report. Deliberately contains no *synchronous* setState, so it is safe
   * to call straight from an effect — every state write here happens after an await.
   */
  const fetchReport = useCallback(async () => {
    try {
      setReport(await api.get<SchemaReport>('/api/admin/schema'));
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Could not inspect the database');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  /** Manual re-check: unlike the initial load, this has to bring the skeleton back. */
  const load = useCallback(async () => {
    setLoading(true);
    await fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    // `loading` already starts as true, so the first fetch needs no synchronous state
    // change to announce itself. eslint still flags this line — the rule is static and
    // cannot see that every write in `fetchReport` happens after an await — so the
    // warning is pre-existing and left standing rather than silenced with a disable.
    fetchReport();
  }, [fetchReport]);

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

  /**
   * Downloads a full SQL dump to the operator's own machine.
   *
   * This exists because "back up before you change anything" was, on this host, a step
   * that required a terminal nobody had. The server verifies the dump before sending
   * it, so reaching this success path means the file is restorable — not merely that
   * bytes arrived.
   */
  const runBackup = async () => {
    setBusy('backup');
    try {
      const res = await apiDownload('/api/admin/backup');
      const kb = (res.bytes / 1024).toFixed(1);
      const summary =
        `${res.filename} — ${res.meta['x-backup-tables'] ?? '?'} tables, ` +
        `${res.meta['x-backup-rows'] ?? '?'} rows, ${kb} KB`;
      setLastBackup(summary);
      addToast('success', `Backup downloaded and verified: ${summary}`);
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Backup failed');
    } finally {
      setBusy(null);
    }
  };

  /**
   * Reports which stored values still contain mojibake, changing nothing.
   *
   * Read-only on purpose. The corrupted characters — the three-byte runs that show up
   * where an apostrophe, an arrow or a star should be — sit in live post bodies and
   * service copy, and a blind find-and-replace across those columns is how you turn an
   * encoding bug into missing content. So: look first, then approve.
   *
   * (Deliberately described rather than quoted: a literal example of the corruption in
   * this file would be flagged by `npm run encoding:check`, which scans source too.)
   */
  const runEncodingScan = async () => {
    setBusy('scan');
    try {
      const data = await api.post<EncodingScan>('/api/admin/schema', { action: 'encoding-scan' });
      setEncoding(data);
      addToast(
        'success',
        data.total === 0
          ? `No corrupted characters found in ${data.scanned ?? 0} tables.`
          : `${data.total} value(s) need repair across ${data.tables.length} table(s). Nothing changed yet.`
      );
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Encoding check failed');
    } finally {
      setBusy(null);
    }
  };

  /**
   * Applies the repair the scan previewed.
   *
   * The server re-runs the scan before writing rather than trusting a list sent from
   * here, so the preview cannot act on stale values — and so this button can never be
   * turned into an arbitrary UPDATE. Everything lands in one transaction.
   */
  const runEncodingFix = async () => {
    if (
      !window.confirm(
        `Repair ${encoding?.total ?? 0} stored value(s)?\n\n` +
          `This rewrites live content. Download a backup first if you have not already.`
      )
    ) {
      return;
    }

    setBusy('encfix');
    try {
      const data = await api.post<EncodingScan>('/api/admin/schema', { action: 'encoding-fix' });
      setEncoding(data);
      addToast(
        'success',
        data.updated === 0
          ? 'Nothing needed repair — the database is already clean.'
          : `Repaired ${data.updated} value(s) in ${data.tables.length} table(s). Public pages refreshed.`
      );
    } catch (err) {
      addToast('error', err instanceof ApiError ? err.message : 'Encoding repair failed');
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
          {/*
            Deliberately first among the action buttons, and to the left of Repair:
            "back up before you change anything" only holds if the backup is the easier
            click. Both other buttons run DDL.
          */}
          <button
            onClick={runBackup}
            disabled={busy !== null}
            title="Downloads a full .sql dump of the database to this computer"
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === 'backup' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            Download backup
          </button>
          <button
            onClick={runEncodingScan}
            disabled={busy !== null}
            title="Reports stored text containing corrupted characters. Changes nothing."
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === 'scan' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Type className="h-4 w-4" />}
            Check encoding
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

          {lastBackup ? (
            <p className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-xs text-gray-600">
              <span className="font-medium text-gray-900">Backup saved to this computer:</span>{' '}
              <span className="font-mono">{lastBackup}</span>
              <br />
              Import it back through phpMyAdmin → Import if you ever need to restore.
            </p>
          ) : null}

          {/*
            Encoding results. Shown only after an explicit check, because a scan reads
            every text column in the database and is not something to run on page load.
          */}
          {encoding ? (
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-900">Character encoding</h2>
                </div>
                {/* The fix button appears only when there is something to fix. */}
                {(encoding.total ?? 0) > 0 ? (
                  <button
                    onClick={runEncodingFix}
                    disabled={busy !== null}
                    className="flex items-center gap-2 rounded-xl bg-gray-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {busy === 'encfix' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wrench className="h-3.5 w-3.5" />
                    )}
                    Repair {encoding.total} value{encoding.total === 1 ? '' : 's'}
                  </button>
                ) : null}
              </header>

              <div className="px-6 py-4">
                <p className="text-sm text-gray-700">
                  {encoding.updated !== undefined
                    ? encoding.updated === 0
                      ? 'Nothing needed repair.'
                      : `Repaired ${encoding.updated} value(s) in ${encoding.tables.join(', ')}. Public pages have been refreshed.`
                    : (encoding.total ?? 0) === 0
                      ? `No corrupted characters in any of the ${encoding.scanned ?? 0} tables checked.`
                      : `${encoding.total} value(s) in ${encoding.tables.join(', ')} contain corrupted characters. Nothing has been changed yet.`}
                </p>

                {encoding.samples.length > 0 ? (
                  <div className="mt-3 max-h-64 overflow-auto rounded-xl bg-gray-50 p-3">
                    <ul className="space-y-1.5">
                      {encoding.samples.map((sample, i) => (
                        <li key={i} className="font-mono text-[11px] leading-relaxed text-gray-600">
                          {sample}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {encoding.skipped?.length ? (
                  <p className="mt-3 text-xs text-gray-500">
                    Not checked (no single-column primary key, so a row cannot be addressed
                    safely): {encoding.skipped.join(', ')}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

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

              {/*
                The directory being absent is the failure that matters, and it is not
                self-explanatory: the upload route creates this directory on demand, so
                if it is missing, something deleted it — on this host, the deploy, which
                replaces the application directory and takes untracked folders with it.
                Uploading would appear to work again and break again on the next deploy,
                so the fix has to move the directory outside the deployed tree.
              */}
              {!report.uploads.exists ? (
                <div className="border-b border-amber-100 bg-amber-50 px-6 py-3 text-xs text-amber-900">
                  <strong>This directory does not exist, so no image can be served.</strong>
                  <p className="mt-1">
                    The upload route creates it automatically, so if it is missing it was
                    deleted — normally by a deploy replacing the application directory. Uploading
                    again would work until the next deploy and then break again.
                  </p>
                  <p className="mt-1">
                    Fix it permanently by pointing{' '}
                    <code className="font-mono">UPLOAD_DIR_OVERRIDE</code> at a directory{' '}
                    <em>outside</em> the deployed folder, then restarting the app.
                  </p>
                </div>
              ) : null}

              <dl className="grid gap-px bg-gray-100 sm:grid-cols-2">
                <ShapeRow label="Resolved path" value={report.uploads.dir} required />
                <ShapeRow label="Working directory" value={report.uploads.cwd} />
                <ShapeRow
                  label="Directory exists"
                  value={report.uploads.exists ? 'yes' : 'no — nothing can be served'}
                  required
                />
                {/*
                  Only meaningful once the directory exists. Reporting "uploads will fail"
                  for an absent directory was actively misleading: the route would have
                  created it.
                */}
                <ShapeRow
                  label="Writable"
                  value={
                    !report.uploads.exists
                      ? 'not checked — directory absent'
                      : report.uploads.writable
                        ? 'yes'
                        : 'no — uploads will fail'
                  }
                  required={report.uploads.exists}
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
