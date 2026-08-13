import Link from 'next/link';
import { FileText, Users, Inbox, Plus } from 'lucide-react';
import pool from '@/lib/db';

async function getDashboardData() {
  const [postRows] = await pool.execute("SELECT COUNT(*) as total FROM posts WHERE status = 'published'");
  const [teamRows] = await pool.execute('SELECT COUNT(*) as total FROM team_members WHERE is_active = 1');
  const [subRows] = await pool.execute("SELECT COUNT(*) as total FROM submissions WHERE status = 'new'");
  const [recentSubs] = await pool.execute('SELECT id, name, email, service, status, created_at FROM submissions ORDER BY created_at DESC LIMIT 5');
  return {
    publishedPosts: (postRows as any[])[0].total,
    teamMembers: (teamRows as any[])[0].total,
    newSubmissions: (subRows as any[])[0].total,
    recentSubmissions: recentSubs as any[],
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const stats = [
    { icon: FileText, label: 'Published Posts', value: data.publishedPosts, href: '/admin/blog' },
    { icon: Users, label: 'Team Members', value: data.teamMembers, href: '/admin/team' },
    { icon: Inbox, label: 'New Submissions', value: data.newSubmissions, href: '/admin/submissions' },
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Overview of your site</p>
        </div>
        <Link href="/admin/blog/new" className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800">
          <Plus className="h-4 w-4" /> New Post
        </Link>
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-gray-300 hover:shadow-sm">
            <stat.icon className="h-8 w-8 text-gray-400" />
            <h3 className="mt-3 text-3xl font-bold tracking-tight">{stat.value}</h3>
            <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
          </Link>
        ))}
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold">Recent Submissions</h2>
          <Link href="/admin/submissions" className="text-sm text-gray-500 hover:text-gray-900">View all</Link>
        </div>
        {data.recentSubmissions.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">No submissions yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.recentSubmissions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium">{sub.name}</p>
                  <p className="text-sm text-gray-500">{sub.service}</p>
                </div>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">{sub.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
