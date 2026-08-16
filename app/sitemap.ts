import type { MetadataRoute } from 'next';
import pool from '@/lib/db';

/**
 * ISR floor, so newly published posts and services appear in the sitemap without
 * a redeploy. `revalidateBlog()`/`revalidateServices()` also invalidate this path.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://productregistrationinuae.com';
  
  const staticPages = [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${base}/services`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${base}/team`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${base}/contact`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
  ];
  
  let servicePages: MetadataRoute.Sitemap = [];
  let blogPages: MetadataRoute.Sitemap = [];
  
  try {
    const [services] = await pool.execute('SELECT slug, updated_at FROM services WHERE is_active = 1 AND deleted_at IS NULL');
    servicePages = (services as any[]).map((s) => ({
      url: `${base}/services/${s.slug}`,
      lastModified: new Date(s.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
    
    const [posts] = await pool.execute(`SELECT slug, updated_at FROM posts
        WHERE status = 'published'
          AND (published_at IS NULL OR published_at <= NOW())
          AND deleted_at IS NULL`);
    blogPages = (posts as any[]).map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));
  } catch {
    // Database not available during build
  }
  
  return [...staticPages, ...servicePages, ...blogPages];
}
