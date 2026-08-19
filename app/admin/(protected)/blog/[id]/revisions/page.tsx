import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, History } from 'lucide-react';
import pool from '@/lib/db';
import { requireAdminRole } from '@/lib/dal';
import { listRevisions } from '@/lib/revisions';
import RestoreButton from './RestoreButton';

export const dynamic = 'force-dynamic';

/**
 * Revision history for a post.
 *
 * Admin-only, matching the API routes behind it: a restore overwrites live content,
 * and the listing shows the full past state of drafts.
 */
async function getPost(id: number) {
  const [rows] = await pool.execute(
    'SELECT id, title, slug FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id]
  );
  return (rows as any[])[0] ?? null;
}

/** Body size at a glance — the list endpoint deliberately ships no bodies. */
function formatSize(chars: number): string {
  const n = Number(chars) || 0;
  return n < 1024 ? `${n} chars` : `${(n / 1024).toFixed(1)} KB`;
}

export default async function BlogRevisionsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminRole();

  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const post = await getPost(id);
  if (!post) notFound();

  const revisions = await listRevisions(id);

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revision History</h1>
          <p className="mt-1 text-sm text-gray-500">
            {post.title} — {revisions.length} revision(s)
          </p>
        </div>
        <Link
          href={`/admin/blog/${id}/edit`}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back to editor
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {revisions.length === 0 ? (
          <div className="p-12 text-center">
            <History className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No revisions yet</p>
            <p className="mt-1 text-xs text-gray-400">
              A snapshot is filed automatically the next time this post is saved.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-6 py-3">Revision</th>
                  <th className="px-6 py-3">When</th>
                  <th className="px-6 py-3">Who</th>
                  <th className="px-6 py-3">Note</th>
                  <th className="px-6 py-3">Size</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {revisions.map((revision) => (
                  <tr key={revision.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium">#{revision.revision_number}</p>
                      <p className="text-xs text-gray-400">{revision.title || 'Untitled'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(revision.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {revision.edited_by_email || revision.author || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{revision.note || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatSize(revision.content_length)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end">
                        <RestoreButton
                          postId={id}
                          revisionId={revision.id}
                          revisionNumber={revision.revision_number}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Restoring writes the selected revision back onto the post and files the current
        version as a new revision first, so a restore can itself be undone.
      </p>
    </div>
  );
}
