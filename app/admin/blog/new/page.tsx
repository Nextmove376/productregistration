'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewBlogPostPage() {
  const [formData, setFormData] = useState({ title: '', slug: '', excerpt: '', content: '', featured_image: '', is_published: false });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/blog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error || 'Failed to create post');
      return;
    }
    router.push('/admin/blog');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Blog Post</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
        <input type="text" placeholder="Title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required />
        <input type="text" placeholder="Slug" value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required />
        <textarea placeholder="Excerpt" value={formData.excerpt} onChange={(e) => setFormData({...formData, excerpt: e.target.value})} className="w-full px-4 py-2 border rounded-lg" rows={3} />
        <textarea placeholder="Content (HTML)" value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} className="w-full px-4 py-2 border rounded-lg" rows={10} required />
        <input type="text" placeholder="Featured Image URL" value={formData.featured_image} onChange={(e) => setFormData({...formData, featured_image: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={formData.is_published} onChange={(e) => setFormData({...formData, is_published: e.target.checked})} />
          <span>Publish immediately</span>
        </label>
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Create Post</button>
      </form>
    </div>
  );
}
