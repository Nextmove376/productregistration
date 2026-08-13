'use client';
import { useEffect, useState } from 'react';
import { BarChart3, Eye, Users, FileText } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); fetch(`/api/admin/analytics?range=${range}`).then(r => r.json()).then(d => { setData(d); setLoading(false); }); }, [range]);
  if (loading) return <div className="p-8 text-center text-gray-400">Loading analytics...</div>;
  if (!data) return null;
  const { stats, daily, topPages } = data;
  return (
    <div>
      <div className="mb-6 flex items-center justify-between"><h1 className="text-2xl font-bold tracking-tight">Analytics</h1><div className="flex gap-2">{['7d','30d','90d'].map(r => <button key={r} onClick={() => setRange(r)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${range===r?'bg-gray-900 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{r}</button>)}</div></div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[{icon:Eye,label:'Total Views',value:stats.totalViews},{icon:Users,label:'Visitors',value:stats.totalVisitors},{icon:FileText,label:'Published Posts',value:stats.publishedPosts},{icon:BarChart3,label:'Submissions',value:stats.submissions}].map(s => (
          <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-6"><s.icon className="h-6 w-6 text-gray-400" /><h3 className="mt-3 text-2xl font-bold">{s.value.toLocaleString()}</h3><p className="mt-1 text-sm text-gray-500">{s.label}</p></div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6"><h2 className="mb-4 font-semibold">Daily Views</h2><div className="space-y-2">{(daily||[]).map((d:any,i:number) => (<div key={i} className="flex items-center gap-3"><span className="w-20 text-xs text-gray-400">{d.date?.split('T')[0]}</span><div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gray-900 rounded-full" style={{width:`${Math.min(100,(d.views/Math.max(...(daily||[]).map((x:any)=>x.views),1))*100)}%`}} /></div><span className="w-12 text-right text-xs text-gray-500">{d.views}</span></div>))}</div></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6"><h2 className="mb-4 font-semibold">Top Pages</h2><div className="space-y-3">{(topPages||[]).map((p:any,i:number) => (<div key={i} className="flex items-center justify-between"><span className="truncate text-sm text-gray-600">{p.path}</span><span className="text-sm font-medium">{p.views}</span></div>))}</div></div>
      </div>
    </div>
  );
}
