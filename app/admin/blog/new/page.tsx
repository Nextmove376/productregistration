'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewBlogPostPage() {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image: '',
    image_alt: '',
    status: 'draft' as 'draft' | 'published',
    meta_title: '',
    meta_description: '',
  });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || 'Failed to create post');
        return;
      }
      router.push('/admin/blog');
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const autoSlug = () => {
    if (!formData.slug && formData.title) {
      setFormData({
        ...formData,
        slug: formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      });
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Blog Post</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              placeholder="Post title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              onBlur={autoSlug}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug *</label>
            <input
              type="text"
              placeholder="post-url-slug"
              value={formData.slug}
              onChange={(e) => setFormData({...formData, slug: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Excerpt</label>
          <textarea
            placeholder="Brief description for cards and SEO"
            value={formData.excerpt}
            onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
            className="w-full px-4 py-2 border rounded-lg"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Content (HTML) *</label>
          <textarea
            placeholder="Post content in HTML"
            value={formData.content}
            onChange={(e) => setFormData({...formData, content: e.target.value})}
            className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
            rows={12}
            required
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Featured Image URL</label>
            <input
              type="text"
              placeholder="/images/example.jpg or https://..."
              value={formData.featured_image}
              onChange={(e) => setFormData({...formData, featured_image: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Image Alt Text</label>
            <input
              type="text"
              placeholder="Descriptive alt text"
              value={formData.image_alt}
              onChange={(e) => setFormData({...formData, image_alt: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Meta Title</label>
            <input
              type="text"
              placeholder="SEO title (defaults to post title)"
              value={formData.meta_title}
              onChange={(e) => setFormData({...formData, meta_title: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Meta Description</label>
            <input
              type="text"
              placeholder="SEO description"
              value={formData.meta_description}
              onChange={(e) => setFormData({...formData, meta_description: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({...formData, status: e.target.value as 'draft' | 'published'})}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="draft">Draft</option>
            <option value="published">Publish Now</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-ink text-white px-6 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create Post'}
        </button>
      </form>
    </div>
  );
}
