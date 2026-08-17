import pool from './db';
import { hasColumn, selectList, softDeleteFilter } from './schema';
import { SEED_SERVICES } from './service-seed';
import { logger } from './logger';

/**
 * Header navigation data.
 *
 * The header used to be a flat list of six hard-coded links, so the six single-service
 * pages were unreachable except by going to `/services` first, and adding a service in
 * the admin panel changed nothing in the navigation.
 *
 * Both lists are read from the database and fall back to what ships in code, which
 * matters for two reasons: the header renders on every page, so it must never be the
 * thing that breaks one, and the six built-in service pages exist as routes whether or
 * not they have rows yet.
 */
export interface NavChild {
  label: string;
  href: string;
  /** Short line under the label in the desktop dropdown. */
  hint?: string;
}

const SERVICE_FALLBACK: NavChild[] = SEED_SERVICES.map((s) => ({
  label: s.title,
  href: `/services/${s.slug}`,
  hint: s.tag,
}));

export async function getServiceNav(): Promise<NavChild[]> {
  try {
    const columns = await selectList('services', ['slug', 'title', 'tag', 'sort_order'], []);
    const notDeleted = await softDeleteFilter('services');
    const activeOnly = (await hasColumn('services', 'is_active')) ? ' AND is_active = 1' : '';
    const order = await orderBy('services', ['sort_order', 'title']);

    const [rows] = await pool.query(
      `SELECT ${columns} FROM services
        WHERE 1=1${activeOnly}${notDeleted}
        ${order}
        LIMIT 12`
    );

    const list = (rows as { slug?: string; title?: string; tag?: string | null }[])
      .filter((r) => r.slug && r.title)
      .map((r) => ({
        label: String(r.title),
        href: `/services/${r.slug}`,
        hint: r.tag ? String(r.tag) : undefined,
      }));

    // An empty table is the normal state before the services are imported — the six
    // built-in pages are live regardless, so the menu must still list them.
    return list.length > 0 ? mergeWithFallback(list) : SERVICE_FALLBACK;
  } catch (err) {
    logger.warn('nav.services_failed', { err });
    return SERVICE_FALLBACK;
  }
}

/**
 * Keeps a built-in page in the menu even if its row is missing or inactive, so the
 * navigation can never point at fewer pages than the site actually serves.
 */
function mergeWithFallback(list: NavChild[]): NavChild[] {
  const hrefs = new Set(list.map((i) => i.href));
  return [...list, ...SERVICE_FALLBACK.filter((f) => !hrefs.has(f.href))];
}

/** `ORDER BY` limited to columns the live table has — an unknown one is a hard error. */
async function orderBy(table: string, preferred: string[]): Promise<string> {
  const usable: string[] = [];
  for (const column of preferred) {
    if (await hasColumn(table, column)) usable.push(`\`${column}\``);
  }
  return usable.length ? `ORDER BY ${usable.join(', ')}` : '';
}

export async function getTeamNav(): Promise<NavChild[]> {
  try {
    const columns = await selectList('team_members', ['id', 'name', 'role'], []);
    const notDeleted = await softDeleteFilter('team_members');
    const activeOnly = (await hasColumn('team_members', 'is_active')) ? ' AND is_active = 1' : '';
    const order = await orderBy('team_members', ['sort_order', 'name']);

    const [rows] = await pool.query(
      `SELECT ${columns} FROM team_members
        WHERE 1=1${activeOnly}${notDeleted}
        ${order}
        LIMIT 12`
    );

    return (rows as { id?: number; name?: string; role?: string | null }[])
      .filter((r) => r.name)
      .map((r) => ({
        label: String(r.name),
        // There is no per-member page, so the menu deep-links to the member's card.
        href: `/team#member-${r.id ?? ''}`,
        hint: r.role ? String(r.role) : undefined,
      }));
  } catch (err) {
    logger.warn('nav.team_failed', { err });
    return [];
  }
}
