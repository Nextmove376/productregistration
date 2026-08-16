'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Eye,
  Users,
  Inbox,
  FileText,
  Package,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
} from 'lucide-react';
import { api, ApiError } from '@/lib/client-api';

interface Breakdown {
  label: string;
  value: number;
}

interface AnalyticsData {
  range: string;
  days: number;
  stats: {
    totalViews: number;
    totalVisitors: number;
    submissions: number;
    publishedPosts: number;
    activeServices: number;
  };
  previous: { totalViews: number; totalVisitors: number; submissions: number };
  daily: { date: string; views: number; visitors: number }[];
  topPages: { path: string; views: number }[];
  topPosts: { slug: string; title: string; views: number }[];
  breakdowns: {
    device: Breakdown[];
    browser: Breakdown[];
    os: Breakdown[];
    referrer: Breakdown[];
    country: Breakdown[];
  };
}

const RANGES = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
];

export default function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [range, setRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api.get(`/api/admin/analytics?range=${range}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load analytics');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ['Date', 'Views', 'Visitors'],
      ...data.daily.map((d) => [String(d.date).slice(0, 10), String(d.views), String(d.visitors)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isEmpty = data && data.stats.totalViews === 0 && data.daily.length === 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">Traffic and lead performance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  range === r.id ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={exportCsv}
            disabled={!data || data.daily.length === 0}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/*
        Explains a genuinely-empty state rather than showing bare zeros. Until the
        pageview beacon was wired up, `pageviews` was never written to at all, so
        this screen reported zeros permanently with no explanation.
      */}
      {isEmpty && !loading && (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-800">
          <p className="font-medium">No traffic recorded for this period yet.</p>
          <p className="mt-1">
            Pageviews are collected as visitors browse the public site and aggregated into daily
            totals by the rollup cron. If this stays empty after real visits, check that the rollup
            job is running.
          </p>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={Eye}
          label="Page views"
          value={data?.stats.totalViews}
          previous={data?.previous.totalViews}
          loading={loading}
        />
        <StatCard
          icon={Users}
          label="Visitors"
          value={data?.stats.totalVisitors}
          previous={data?.previous.totalVisitors}
          loading={loading}
        />
        <StatCard
          icon={Inbox}
          label="Submissions"
          value={data?.stats.submissions}
          previous={data?.previous.submissions}
          loading={loading}
        />
        <StatCard icon={FileText} label="Published posts" value={data?.stats.publishedPosts} loading={loading} />
        {/* Was computed by the API but never rendered. */}
        <StatCard icon={Package} label="Active services" value={data?.stats.activeServices} loading={loading} />
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <BarChart3 className="h-4 w-4 text-gray-400" /> Views over time
        </h2>
        {loading ? (
          <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
        ) : (
          <TrendChart points={data?.daily ?? []} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BreakdownCard title="Top pages" items={(data?.topPages ?? []).map((p) => ({ label: p.path, value: p.views }))} loading={loading} />
        <BreakdownCard title="Top posts" items={(data?.topPosts ?? []).map((p) => ({ label: p.title, value: p.views }))} loading={loading} />
        <BreakdownCard title="Referrers" items={data?.breakdowns.referrer ?? []} loading={loading} />
        <BreakdownCard title="Countries" items={data?.breakdowns.country ?? []} loading={loading} />
        <BreakdownCard title="Devices" items={data?.breakdowns.device ?? []} loading={loading} />
        <BreakdownCard title="Browsers" items={data?.breakdowns.browser ?? []} loading={loading} />
        <BreakdownCard title="Operating systems" items={data?.breakdowns.os ?? []} loading={loading} />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  previous,
  loading,
}: {
  icon: typeof Eye;
  label: string;
  value?: number;
  previous?: number;
  loading: boolean;
}) {
  const delta = useMemo(() => {
    if (value === undefined || previous === undefined || previous === 0) return null;
    return Math.round(((value - previous) / previous) * 100);
  }, [value, previous]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <Icon className="h-6 w-6 text-gray-400" />
      {loading ? (
        <div className="mt-3 h-8 w-16 animate-pulse rounded bg-gray-100" />
      ) : (
        <h3 className="mt-3 text-2xl font-bold tracking-tight">{(value ?? 0).toLocaleString()}</h3>
      )}
      <p className="mt-1 text-sm text-gray-500">{label}</p>
      {delta !== null && !loading && (
        <p
          className={`mt-1 flex items-center gap-1 text-xs font-medium ${
            delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-gray-400'
          }`}
        >
          {delta > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : delta < 0 ? (
            <TrendingDown className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          {Math.abs(delta)}% vs previous period
        </p>
      )}
    </div>
  );
}

/**
 * Hand-rolled SVG line + area chart.
 *
 * Replaces the CSS-height bars the page used before, without adding a charting
 * dependency to a project deployed on shared hosting.
 */
function TrendChart({ points }: { points: { date: string; views: number; visitors: number }[] }) {
  if (points.length === 0) {
    return <div className="flex h-48 items-center justify-center text-sm text-gray-400">No data for this period</div>;
  }

  const width = 100;
  const height = 40;
  const max = Math.max(...points.map((p) => p.views), 1);

  const toPath = (key: 'views' | 'visitors') =>
    points
      .map((p, i) => {
        const x = points.length === 1 ? width / 2 : (i / (points.length - 1)) * width;
        const y = height - (p[key] / max) * height;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');

  const areaPath = `${toPath('views')} L${width},${height} L0,${height} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-48 w-full" role="img" aria-label="Views over time">
        <defs>
          <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#111827" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#111827" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" y1={height * f} x2={width} y2={height * f} stroke="#f3f4f6" strokeWidth="0.3" />
        ))}
        <path d={areaPath} fill="url(#viewsFill)" />
        <path d={toPath('views')} fill="none" stroke="#111827" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        <path
          d={toPath('visitors')}
          fill="none"
          stroke="#0d9488"
          strokeWidth="0.6"
          strokeDasharray="2 1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-gray-900" /> Views
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-teal-600" /> Visitors
          </span>
        </div>
        <div className="flex gap-2 text-xs text-gray-400">
          <span>{String(points[0].date).slice(0, 10)}</span>
          <span>→</span>
          <span>{String(points[points.length - 1].date).slice(0, 10)}</span>
        </div>
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  items,
  loading,
}: {
  title: string;
  items: Breakdown[];
  loading: boolean;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 font-semibold">{title}</h2>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">No data yet</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.label}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="truncate text-sm text-gray-700" title={item.label}>
                  {item.label}
                </span>
                <span className="shrink-0 text-sm font-medium text-gray-900">
                  {item.value.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gray-900"
                  style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
