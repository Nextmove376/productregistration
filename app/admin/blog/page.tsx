'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Search } from 'lucide-react';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  created_at: string;
  views: number;
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blog').then(r => r.json()).then(data => {
      setPosts(data);
      setLoading(false);
    });
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    await fetch(`/api/blog/${id}`, { method: 'DELETE' });
    setPosts(posts.filter(p => p.id !== id));
  };

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Blog Posts</h1>
        <Link href="/admin/blog/new" className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800">
          <Plus className="h-4 w-4" /> New Post
        </Link>
      </div>

      <div className="mb-4 flex gap-2">
        {['all', 'draft', 'published', 'scheduled'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${filter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No posts found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Views</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium">{post.title}</p>
                    <p className="text-xs text-gray-400">/blog/{post.slug}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${post.status === 'published' ? 'bg-green-100 text-green-700' : post.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{post.views}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(post.published_at || post.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <Link href={`/admin/blog/${post.id}/edit`} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"><Edit className="h-4 w-4" /></Link>
                    <button onClick={() => handleDelete(post.id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
