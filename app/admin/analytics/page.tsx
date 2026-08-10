'use client';

import { useEffect, useState } from 'react';
import { Eye, Users, MessageSquare, Globe, Monitor, Smartphone, Tablet } from 'lucide-react';

type Analytics = {
  overview: { views: number; visitors: number; submissions: number };
  topPages: Array<{ path: string; views: number }>;
  countries: Array<{ country: string; views: number }>;
  referrers: Array<{ referrer_host: string; views: number }>;
  devices: Array<{ device: string; views: number }>;
  daily: Array<{ date: string; views: number; visitors: number }>;
};

const COUNTRY_FLAGS: Record<string, string> = {
  AE: '🇦🇪', SA: '🇸🇦', US: '🇺🇸', GB: '🇬🇧', IN: '🇮🇳', PK: '🇵🇰',
  EG: '🇪🇬', JO: '🇯🇴', LB: '🇱🇧', KW: '🇰🇼', QA: '🇶🇦', BH: '🇧🇭',
  OM: '🇴🇲', DE: '🇩🇪', FR: '🇫🇷', JP: '🇯🇵', CN: '🇨🇳', AU: '🇦🇺',
};

function DeviceIcon({ device }: { device: string }) {
  if (device === 'mobile') return <Smartphone className="w-4 h-4" />;
  if (device === 'tablet') return <Tablet className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics?days=${days}`)
      .then(res => res.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!data) {
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">Failed to load analytics data.</div>;
  }

  const maxDaily = Math.max(...data.daily.map(d => d.views), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <Eye className="w-8 h-8 text-blue-600 mb-2" />
          <h3 className="text-2xl font-bold">{data.overview.views.toLocaleString()}</h3>
          <p className="text-gray-600 text-sm">Page Views</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <Users className="w-8 h-8 text-green-600 mb-2" />
          <h3 className="text-2xl font-bold">{data.overview.visitors.toLocaleString()}</h3>
          <p className="text-gray-600 text-sm">Unique Visitors</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <MessageSquare className="w-8 h-8 text-purple-600 mb-2" />
          <h3 className="text-2xl font-bold">{data.overview.submissions.toLocaleString()}</h3>
          <p className="text-gray-600 text-sm">Submissions</p>
        </div>
      </div>

      {/* Daily Chart */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-lg font-semibold mb-4">Traffic Over Time</h2>
        <div className="flex items-end gap-1 h-48">
          {data.daily.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-blue-500 rounded-t"
                style={{ height: `${(d.views / maxDaily) * 100}%`, minHeight: d.views > 0 ? 4 : 0 }}
                title={`${d.date}: ${d.views} views, ${d.visitors} visitors`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{data.daily[0]?.date}</span>
          <span>{data.daily[data.daily.length - 1]?.date}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Top Pages */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Top Pages</h2>
          <div className="space-y-3">
            {data.topPages.map((p, i) => (
              <div key={p.path} className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm text-gray-500 w-6">{i + 1}</span>
                  <span className="text-sm truncate">{p.path}</span>
                </div>
                <span className="text-sm font-medium text-gray-600">{p.views}</span>
              </div>
            ))}
            {data.topPages.length === 0 && <p className="text-gray-500 text-sm">No data yet.</p>}
          </div>
        </div>

        {/* Countries */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Countries</h2>
          <div className="space-y-3">
            {data.countries.map((c, i) => (
              <div key={c.country} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-6">{i + 1}</span>
                  <span className="text-lg">{COUNTRY_FLAGS[c.country] || '🌍'}</span>
                  <span className="text-sm">{c.country}</span>
                </div>
                <span className="text-sm font-medium text-gray-600">{c.views}</span>
              </div>
            ))}
            {data.countries.length === 0 && <p className="text-gray-500 text-sm">No data yet.</p>}
          </div>
        </div>

        {/* Referrers */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Traffic Sources</h2>
          <div className="space-y-3">
            {data.referrers.map((r, i) => (
              <div key={r.referrer_host} className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm text-gray-500 w-6">{i + 1}</span>
                  <span className="text-sm truncate">{r.referrer_host}</span>
                </div>
                <span className="text-sm font-medium text-gray-600">{r.views}</span>
              </div>
            ))}
            {data.referrers.length === 0 && <p className="text-gray-500 text-sm">No data yet.</p>}
          </div>
        </div>

        {/* Devices */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Devices</h2>
          <div className="space-y-3">
            {data.devices.map((d) => (
              <div key={d.device} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DeviceIcon device={d.device} />
                  <span className="text-sm capitalize">{d.device}</span>
                </div>
                <span className="text-sm font-medium text-gray-600">{d.views}</span>
              </div>
            ))}
            {data.devices.length === 0 && <p className="text-gray-500 text-sm">No data yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
