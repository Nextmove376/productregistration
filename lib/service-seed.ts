import pool from './db';
import { presentColumns } from './schema';

/**
 * The six service pages that ship as code, so the admin panel can edit them.
 *
 * `/admin/services` was empty — and therefore "how do I edit the existing pages?" —
 * because the six single-service pages live as static routes under
 * `app/services/<slug>/page.tsx` and were never rows in the database. The admin panel
 * lists rows, so it listed nothing.
 *
 * `ServicePageLayout` merges a service's `body` JSON over the hardcoded copy, keyed by
 * slug. So a row per page is all that is needed for the hero, breadcrumb label, logo
 * ticker and "Our Services" section to become editable — the slugs below match the
 * route folder names exactly, which is what makes the merge line up.
 *
 * Titles, tags and summaries are the same ones `app/services/page.tsx` falls back to,
 * so seeding cannot change what the public listing already shows.
 */
export interface SeedService {
  slug: string;
  title: string;
  tag: string;
  summary: string;
  icon: string;
  sort_order: number;
}

export const SEED_SERVICES: SeedService[] = [
  {
    slug: 'product-registration',
    title: 'Product Registration',
    tag: 'Product Compliance',
    summary:
      'Register cosmetics, food, supplements, and consumer products with Dubai Municipality, ESMA, and MOIAT.',
    icon: 'package',
    sort_order: 1,
  },
  {
    slug: 'mohap-registration',
    title: 'MOHAP Registration',
    tag: 'Healthcare Regulatory',
    summary:
      'Register medical devices, pharmaceuticals, and health products with the UAE Ministry of Health.',
    icon: 'shield',
    sort_order: 2,
  },
  {
    slug: 'business-setup',
    title: 'Business Setup',
    tag: 'Company Formation',
    summary: 'Mainland, freezone, and offshore company formation in Dubai and the UAE.',
    icon: 'building',
    sort_order: 3,
  },
  {
    slug: 'mofa-attestation',
    title: 'MOFA Attestation',
    tag: 'Government Services',
    summary: 'Document attestation, embassy legalization, and PRO services in Dubai.',
    icon: 'file-text',
    sort_order: 4,
  },
  {
    slug: 'medical-drugstore',
    title: 'Medical & Drugstore',
    tag: 'Healthcare Business',
    summary: 'Pharmacy setup, drugstore licensing, and trademark registration.',
    icon: 'cross',
    sort_order: 5,
  },
  {
    slug: 'regulatory-approvals',
    title: 'Regulatory Approvals',
    tag: 'Compliance & Certification',
    summary: 'ESMA certification, GMP verification, Halal certification, and lab testing.',
    icon: 'check',
    sort_order: 6,
  },
];

export const SEED_SLUGS = new Set(SEED_SERVICES.map((s) => s.slug));

/**
 * Inserts any of the six that are not in the database yet, and never touches one that
 * is — so it is safe to call on every admin list request and can never overwrite an
 * edit. Returns the slugs it created.
 *
 * Deliberately quiet: a failure here must not take the services screen down, it just
 * means the list stays as it was.
 */
export async function ensureServicesSeeded(): Promise<string[]> {
  try {
    // Include soft-deleted rows: a slug the user deliberately deleted must stay deleted.
    const [rows] = await pool.query('SELECT slug FROM services');
    const existing = new Set((rows as { slug: string }[]).map((r) => r.slug));
    const missing = SEED_SERVICES.filter((s) => !existing.has(s.slug));
    if (missing.length === 0) return [];

    // Only write columns the live table actually has, so seeding works even before
    // the schema repair has run.
    const wanted = ['slug', 'title', 'tag', 'summary', 'icon', 'sort_order', 'is_active'];
    const cols = await presentColumns('services', wanted);
    if (!cols.includes('slug') || !cols.includes('title')) return [];

    const placeholders = `(${cols.map(() => '?').join(', ')})`;
    const values: unknown[] = [];
    for (const service of missing) {
      for (const col of cols) {
        values.push(col === 'is_active' ? 1 : (service as unknown as Record<string, unknown>)[col] ?? null);
      }
    }

    await pool.query(
      `INSERT IGNORE INTO services (${cols.map((c) => `\`${c}\``).join(', ')})
        VALUES ${missing.map(() => placeholders).join(', ')}`,
      values
    );

    return missing.map((s) => s.slug);
  } catch {
    return [];
  }
}
