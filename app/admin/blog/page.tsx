'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  is_published: number;
  created_at: string;
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/blog')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load blog posts');
        return res.json();
      })
      .then(setPosts)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    const res = await fetch(`/api/blog/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setPosts(posts.filter(p => p.id !== id));
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Blog Posts</h1>
        <Link href="/admin/blog/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Post
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow-md">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="border-t">
                <td className="px-4 py-3">{post.title}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-sm ${post.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {post.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3">{new Date(post.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 flex gap-2">
                  <Link href={`/admin/blog/${post.id}/edit`} className="text-blue-600 hover:underline"><Edit className="w-4 h-4" /></Link>
                  <button onClick={() => handleDelete(post.id)} className="text-red-600 hover:underline"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
