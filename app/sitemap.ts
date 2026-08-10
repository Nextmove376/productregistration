import type { MetadataRoute } from 'next';
import { query } from '@/lib/db';

const BASE_URL = 'https://productregistrationinuae.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/services/product-registration`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/services/mohap-registration`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/services/business-setup`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/services/medical-drugstore`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/services/mofa-attestation`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/services/regulatory-approvals`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/team`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ];

  // Add published blog posts
  try {
    const posts = await query<{ slug: string; updated_at: string }>(
      `SELECT slug, updated_at FROM posts WHERE status = 'published' AND published_at <= NOW() ORDER BY published_at DESC`
    );
    const blogPages: MetadataRoute.Sitemap = posts.map(p => ({
      url: `${BASE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.updated_at).toISOString(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));
    return [...staticPages, ...blogPages];
  } catch {
    // DB unavailable, return static pages only
    return staticPages;
  }
}
