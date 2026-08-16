import Link from 'next/link';
import { FileText, Users, Inbox, Plus, Image as ImageIcon, Clock, AlertTriangle, Activity } from 'lucide-react';
import pool from '@/lib/db';
import { requireSession } from '@/lib/dal';

/**
 * Request-time rendering is mandatory here.
 *
 * Without it Next prerendered this page at build time, producing a static HTML
 * file that contained real submission names and services — served to anyone who
 * requested /admin/dashboard, signed in or not.
 */
export const dynamic = 'force-dynamic';

interface RecentSubmission {
  id: number;
  name: string;
  service: string | null;
  status: string;
  created_at: string;
}

interface ActivityRow {
  id: number;
  user_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
}

async function getDashboardData() {
  // One round trip per metric, but they are independent — run them concurrently.
  const [
    postRows,
    draftRows,
    scheduledDueRows,
    teamRows,
    subRows,
    mediaRows,
    missingAltRows,
    recentSubs,
    activity,
  ] = await Promise.all([
    pool.execute("SELECT COUNT(*) AS total FROM posts WHERE status = 'published' AND deleted_at IS NULL"),
    pool.execute("SELECT COUNT(*) AS total FROM posts WHERE status = 'draft' AND deleted_at IS NULL"),
    pool.execute(
      "SELECT COUNT(*) AS total FROM posts WHERE status = 'scheduled' AND published_at <= NOW() AND deleted_at IS NULL"
    ),
    pool.execute('SELECT COUNT(*) AS total FROM team_members WHERE is_active = 1 AND deleted_at IS NULL'),
    pool.execute("SELECT COUNT(*) AS total FROM submissions WHERE status = 'new' AND deleted_at IS NULL"),
    pool.execute('SELECT COUNT(*) AS total FROM media WHERE deleted_at IS NULL'),
    pool.execute(
      "SELECT COUNT(*) AS total FROM media WHERE (alt IS NULL OR alt = '') AND deleted_at IS NULL"
    ),
    pool.execute(
      `SELECT id, name, service, status, created_at
         FROM submissions
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 5`
    ),
    pool.execute(
      `SELECT id, user_email, action, entity, entity_id, created_at
         FROM audit_log
        ORDER BY created_at DESC
        LIMIT 8`
    ).catch(() => [[]] as const), // audit_log may not exist yet on an un-migrated DB
  ]);

  const count = (r: unknown) => Number((r as any[])[0]?.[0]?.total ?? 0);

  return {
    publishedPosts: count(postRows),
    draftPosts: count(draftRows),
    scheduledDue: count(scheduledDueRows),
    teamMembers: count(teamRows),
    newSubmissions: count(subRows),
    mediaCount: count(mediaRows),
    mediaMissingAlt: count(missingAltRows),
    // Deliberately omits email: the dashboard only needs a name and a service.
    recentSubmissions: (recentSubs as any[])[0] as RecentSubmission[],
    activity: ((activity as any[])[0] ?? []) as ActivityRow[],
  };
}

function formatWhen(value: string | Date) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 ring-blue-200',
  contacted: 'bg-amber-50 text-amber-700 ring-amber-200',
  qualified: 'bg-violet-50 text-violet-700 ring-violet-200',
  won: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  lost: 'bg-gray-100 text-gray-600 ring-gray-200',
};

export default async function DashboardPage() {
  const session = await requireSession('/admin/dashboard');
  const data = await getDashboardData();

  const stats = [
    { icon: FileText, label: 'Published Posts', value: data.publishedPosts, href: '/admin/blog', hint: `${data.draftPosts} draft${data.draftPosts === 1 ? '' : 's'}` },
    { icon: Inbox, label: 'New Submissions', value: data.newSubmissions, href: '/admin/submissions', hint: 'Awaiting first contact' },
    { icon: Users, label: 'Team Members', value: data.teamMembers, href: '/admin/team', hint: 'Active profiles' },
    { icon: ImageIcon, label: 'Media Files', value: data.mediaCount, href: '/admin/media', hint: `${data.mediaMissingAlt} missing alt text` },
  ];

  const attention = [
    data.scheduledDue > 0 && {
      text: `${data.scheduledDue} scheduled post${data.scheduledDue === 1 ? '' : 's'} past their publish time`,
      href: '/admin/blog?status=scheduled',
    },
    data.newSubmissions > 0 && {
      text: `${data.newSubmissions} new submission${data.newSubmissions === 1 ? '' : 's'} to follow up`,
      href: '/admin/submissions?status=new',
    },
    data.mediaMissingAlt > 0 && {
      text: `${data.mediaMissingAlt} media file${data.mediaMissingAlt === 1 ? '' : 's'} without alt text`,
      href: '/admin/media',
    },
  ].filter(Boolean) as { text: string; href: string }[];

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Signed in as {session.email} · {session.role}
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="inline-flex items-center gap-2 self-start rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" /> New Post
        </Link>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-gray-300 hover:shadow-sm"
          >
            <stat.icon className="h-7 w-7 text-gray-400" />
            <h3 className="mt-3 text-3xl font-bold tracking-tight">{stat.value}</h3>
            <p className="mt-1 text-sm font-medium text-gray-700">{stat.label}</p>
            <p className="mt-0.5 text-xs text-gray-400">{stat.hint}</p>
          </Link>
        ))}
      </div>

      {attention.length > 0 && (
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-900">Needs attention</h2>
          </div>
          <ul className="space-y-1.5">
            {attention.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-amber-800 underline-offset-2 hover:underline">
                  {item.text}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold">Recent Submissions</h2>
            <Link href="/admin/submissions" className="text-sm text-gray-500 hover:text-gray-900">
              View all
            </Link>
          </div>
          {data.recentSubmissions.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">No submissions yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.recentSubmissions.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/admin/submissions?id=${sub.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{sub.name}</p>
                    <p className="truncate text-sm text-gray-500">{sub.service || '—'}</p>
                  </div>
                  <div className="ml-4 flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                        STATUS_STYLES[sub.status] ?? STATUS_STYLES.lost
                      }`}
                    >
                      {sub.status}
                    </span>
                    <span className="text-[11px] text-gray-400">{formatWhen(sub.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Activity className="h-4 w-4 text-gray-400" /> Recent Activity
            </h2>
          </div>
          {data.activity.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">
              <Clock className="mx-auto mb-2 h-5 w-5 text-gray-300" />
              No recorded activity yet
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.activity.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-900">
                      <span className="font-medium">{row.action}</span>{' '}
                      <span className="text-gray-500">
                        {row.entity}
                        {row.entity_id ? ` #${row.entity_id}` : ''}
                      </span>
                    </p>
                    <p className="truncate text-xs text-gray-400">{row.user_email || 'system'}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-gray-400">{formatWhen(row.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
