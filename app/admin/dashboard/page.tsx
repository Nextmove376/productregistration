import { FileText, Users, Settings, MessageSquare, Eye, TrendingUp } from 'lucide-react';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getStats() {
  try {
    const [posts, team, submissions, views] = await Promise.all([
      query<{ count: number }>('SELECT COUNT(*) as count FROM posts').then(r => r[0]?.count ?? 0),
      query<{ count: number }>('SELECT COUNT(*) as count FROM team_members WHERE is_active = 1').then(r => r[0]?.count ?? 0),
      query<{ count: number }>('SELECT COUNT(*) as count FROM submissions').then(r => r[0]?.count ?? 0),
      query<{ count: number }>('SELECT COUNT(*) as count FROM pageviews WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)').then(r => r[0]?.count ?? 0).catch(() => 0),
    ]);
    return { posts, team, submissions, views };
  } catch {
    return { posts: 0, team: 0, submissions: 0, views: 0 };
  }
}

async function getRecentSubmissions() {
  try {
    return await query<{ id: number; name: string; email: string; service: string | null; status: string; created_at: string }>(
      'SELECT id, name, email, service, status, created_at FROM submissions ORDER BY created_at DESC LIMIT 5'
    );
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const [stats, recentSubmissions] = await Promise.all([getStats(), getRecentSubmissions()]);

  const statCards = [
    { icon: FileText, label: 'Blog Posts', value: stats.posts, color: 'text-blue-600' },
    { icon: Users, label: 'Team Members', value: stats.team, color: 'text-green-600' },
    { icon: MessageSquare, label: 'Submissions', value: stats.submissions, color: 'text-purple-600' },
    { icon: Eye, label: 'Page Views (30d)', value: stats.views, color: 'text-orange-600' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-lg shadow-md">
            <stat.icon className={`w-8 h-8 ${stat.color} mb-2`} />
            <h3 className="text-2xl font-bold">{stat.value}</h3>
            <p className="text-gray-600 text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Recent Submissions</h2>
        </div>
        {recentSubmissions.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentSubmissions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">{s.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.email}</td>
                  <td className="px-6 py-4 text-sm">{s.service || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      s.status === 'new' ? 'bg-blue-100 text-blue-800' :
                      s.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                      s.status === 'won' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            No submissions yet. They&apos;ll appear here when visitors fill out the contact form.
          </div>
        )}
      </div>
    </div>
  );
}
