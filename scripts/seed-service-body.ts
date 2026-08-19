/**
 * Copies the six hand-authored service pages' built-in content into `services.body`.
 *
 * Why this exists: `resolveServiceContent()` in `lib/service-content.ts` only lets a
 * *non-empty* admin value win, so the six live pages render correctly with `body`
 * NULL — but the admin panel then shows an editor six screens of empty boxes. The
 * content is on the page, not in the CMS, and nobody can edit what they cannot see.
 * This script closes that gap by loading the page copy into the column the admin
 * reads, after which editing is fully in the editor's hands.
 *
 * Reports by default and changes nothing. Writing is opt-in, always writes a
 * restorable backup first, and never silently replaces an editor's work.
 *
 *   npx tsx scripts/seed-service-body.ts                    # dry run: validate + plan
 *   npx tsx scripts/seed-service-body.ts --write            # apply (backup first)
 *   npx tsx scripts/seed-service-body.ts --write --force     # also replace edited fields
 *   npx tsx scripts/seed-service-body.ts --force             # dry run naming what --force would replace
 *   npx tsx scripts/seed-service-body.ts --restore backups/service-body-<stamp>.json
 *
 * Credentials come from the environment. `lib/db.ts` requires DB_HOST / DB_PORT /
 * DB_USER / DB_PASSWORD / DB_NAME, and this script deliberately does *not* import
 * `scripts/test-env.ts`: it writes to a live database, so placeholder credentials
 * would be actively dangerous. If the credentials live in a file, pass it through:
 *
 *   npx tsx --env-file=.env scripts/seed-service-body.ts --write
 *
 * Safety, in order of how much it matters:
 *
 *  1. The mapping of every service is validated against `serviceBodySchema` *before*
 *     the database is touched at all, so a bad mapping is a failed script rather
 *     than a broken public page.
 *  2. A field an editor has already filled in is kept, not overwritten. `--force`
 *     is required to replace one, and the dry run names every field it would
 *     replace before you commit to it.
 *  3. Hero media, "Our Services" cards, the logo ticker, stats, CTA and SEO
 *     overrides are read from the existing row and written back untouched. They are
 *     not part of the page's built-in content, so this script has nothing to say
 *     about them — including under `--force`, which is about copy, not media.
 *  4. Every previous `body` value is backed up to `backups/service-body-<stamp>.json`
 *     before anything is written, and `--restore` puts them all back.
 *  5. All writes happen in one transaction: either all six rows land or none does.
 *
 * A missing row is reported and skipped rather than inserted. A half-populated
 * `services` row (no title, no sort order, no `is_active`) would show up in the
 * admin list and the public listing as a broken entry; `ensureServicesSeeded()` in
 * `lib/service-seed.ts` is what creates these rows properly.
 *
 * Column names beyond `slug` and `body` are read from `information_schema` via
 * `lib/schema.ts` rather than assumed. This deployment has repeatedly run ahead of
 * its own migrations, and a hardcoded `deleted_at` or `id` here would fail with
 * errno 1054 against a live database mid-write.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  parseServiceBody,
  serviceBodySchema,
  type ServiceBody,
} from '../lib/service-content';
import type { ServicePageData } from '../components/services/ServicePageLayout';
import { content as businessSetup } from '../app/services/business-setup/content';
import { content as medicalDrugstore } from '../app/services/medical-drugstore/content';
import { content as mofaAttestation } from '../app/services/mofa-attestation/content';
import { content as mohapRegistration } from '../app/services/mohap-registration/content';
import { content as productRegistration } from '../app/services/product-registration/content';
import { content as regulatoryApprovals } from '../app/services/regulatory-approvals/content';

const ROOT = path.resolve(import.meta.dirname, '..');
const TABLE = 'services';

/**
 * Slug → built-in content.
 *
 * The slug is the join key: `ServicePageLayout` looks up admin content by the last
 * segment of `canonicalUrl`, so a slug here that disagrees with the page's own
 * canonical URL would seed a row the page never reads. `assertSlugsMatch()` below
 * refuses to run in that case rather than seeding into the void.
 */
const SERVICES: { slug: string; content: ServicePageData }[] = [
  { slug: 'business-setup', content: businessSetup },
  { slug: 'medical-drugstore', content: medicalDrugstore },
  { slug: 'mofa-attestation', content: mofaAttestation },
  { slug: 'mohap-registration', content: mohapRegistration },
  { slug: 'product-registration', content: productRegistration },
  { slug: 'regulatory-approvals', content: regulatoryApprovals },
];

const q = (identifier: string) => `\`${identifier}\``;

/** Same derivation `ServicePageLayout` uses, so the two cannot disagree. */
function slugFromCanonical(url: string): string {
  return url.replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop() ?? '';
}

function assertSlugsMatch(): void {
  for (const { slug, content } of SERVICES) {
    const derived = slugFromCanonical(content.canonicalUrl);
    if (derived !== slug) {
      throw new Error(
        `Slug mismatch: mapped as "${slug}" but canonicalUrl resolves to "${derived}". ` +
          `The page reads admin content by the canonical slug, so seeding "${slug}" would have no effect.`
      );
    }
  }
}

/* ------------------------------------------------------------------ *
 * ServicePageData -> serviceBodySchema
 * ------------------------------------------------------------------ */

/**
 * The page's shape mapped onto the column's shape.
 *
 * Two fields genuinely change shape rather than moving:
 *
 *  - `process[].step` is dropped. `resolveServiceContent()` derives it from array
 *    order (`i + 1`), so storing it would give an editor a number to get wrong and
 *    a second source of truth to disagree with.
 *  - `faq` is `{question, answer}` on the page and `{q, a}` in the column — that
 *    shape predates this content model and public pages already read it.
 *
 * Not mapped, deliberately: `serviceName`, `title`, `canonicalUrl` and
 * `targetCountries` have no counterpart in `serviceBodySchema` (title lives in the
 * row's own `title` column, and the other three are structural rather than
 * editorial), so there is nowhere to put them and nothing reads them if there were.
 */
function toServiceBody(d: ServicePageData): unknown {
  return {
    tag: d.tag,
    subtitle: d.subtitle,
    heroDescription: d.heroDescription,
    trustBadge: d.trustBadge ?? '',
    prose: {
      overview: d.overview,
      whatIs: d.whatIs,
      whyImportant: d.whyImportant,
      whoShouldUse: d.whoShouldUse,
    },
    sections: d.included,
    process: d.process.map((s) => ({
      title: s.title,
      description: s.description,
      timeline: s.timeline,
    })),
    documents: d.documents.map((r) => ({ text: r.text, required: r.required ?? true })),
    pricing: d.pricing.map((r) => ({ service: r.service, timeline: r.timeline, price: r.price })),
    differentiators: d.differentiators.map((r) => ({
      icon: r.icon,
      title: r.title,
      description: r.description,
    })),
    relatedServices: d.relatedServices.map((r) => ({
      slug: r.slug,
      title: r.title,
      summary: r.summary,
      tag: r.tag,
    })),
    caseStudy: d.caseStudy
      ? {
          title: d.caseStudy.title,
          problem: d.caseStudy.problem,
          solution: d.caseStudy.solution,
          result: d.caseStudy.result,
          quote: d.caseStudy.quote ?? '',
          client: d.caseStudy.client ?? '',
        }
      : {},
    faq: d.faq.map((f) => ({ q: f.question, a: f.answer })),
  };
}

/**
 * Anything the schema silently changed on the way through.
 *
 * `serviceBodySchema` is lenient by design — it trims strings and drops repeater
 * rows whose key field is blank, so a save from the admin can never be blocked by a
 * half-filled row. That leniency is wrong for a one-off migration of live SEO copy:
 * here a dropped row or a truncated string is data loss, and it would parse
 * successfully. So the parse result is compared back against the source.
 */
function findLoss(d: ServicePageData, parsed: ServiceBody): string[] {
  const loss: string[] = [];

  const sameLength = (label: string, before: number, after: number) => {
    if (before !== after) loss.push(`${label}: ${before} source rows -> ${after} stored`);
  };
  sameLength('included/sections', d.included.length, parsed.sections.length);
  sameLength('process', d.process.length, parsed.process.length);
  sameLength('documents', d.documents.length, parsed.documents.length);
  sameLength('pricing', d.pricing.length, parsed.pricing.length);
  sameLength('differentiators', d.differentiators.length, parsed.differentiators.length);
  sameLength('relatedServices', d.relatedServices.length, parsed.relatedServices.length);
  sameLength('faq', d.faq.length, parsed.faq.length);

  const sameText = (label: string, before: string, after: string) => {
    if (before !== after) {
      loss.push(`${label}: ${before.length} chars -> ${after.length} after trim/validate`);
    }
  };
  sameText('tag', d.tag, parsed.tag);
  sameText('subtitle', d.subtitle, parsed.subtitle);
  sameText('heroDescription', d.heroDescription, parsed.heroDescription);
  sameText('trustBadge', d.trustBadge ?? '', parsed.trustBadge);
  sameText('prose.overview', d.overview, parsed.prose.overview);
  sameText('prose.whatIs', d.whatIs, parsed.prose.whatIs);
  sameText('prose.whyImportant', d.whyImportant, parsed.prose.whyImportant);
  sameText('prose.whoShouldUse', d.whoShouldUse, parsed.prose.whoShouldUse);

  d.included.forEach((s, i) => sameText(`included[${i}]`, s, parsed.sections[i] ?? ''));
  d.faq.forEach((f, i) => {
    sameText(`faq[${i}].question`, f.question, parsed.faq[i]?.q ?? '');
    sameText(`faq[${i}].answer`, f.answer, parsed.faq[i]?.a ?? '');
  });
  d.process.forEach((s, i) => {
    sameText(`process[${i}].title`, s.title, parsed.process[i]?.title ?? '');
    sameText(`process[${i}].description`, s.description, parsed.process[i]?.description ?? '');
  });
  if (d.caseStudy) {
    sameText('caseStudy.problem', d.caseStudy.problem, parsed.caseStudy.problem);
    sameText('caseStudy.solution', d.caseStudy.solution, parsed.caseStudy.solution);
    sameText('caseStudy.result', d.caseStudy.result, parsed.caseStudy.result);
    sameText('caseStudy.quote', d.caseStudy.quote ?? '', parsed.caseStudy.quote);
  }

  return loss;
}

interface Mapped {
  slug: string;
  built: ServiceBody;
  loss: string[];
  summary: string;
}

/**
 * Validates all six mappings. Throws before any database work if one is wrong.
 *
 * Exported as the pure, database-free half of this script: given the same content
 * modules it always returns the same six bodies, which is what makes "seeding cannot
 * change what a page renders" a checkable property rather than a hope.
 */
export function mapAll(): Mapped[] {
  assertSlugsMatch();

  const out: Mapped[] = [];
  const failures: string[] = [];

  for (const { slug, content } of SERVICES) {
    const parsed = serviceBodySchema.safeParse(toServiceBody(content));
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `      ${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('\n');
      failures.push(`  ${slug}\n${issues}`);
      continue;
    }
    const built = parsed.data;
    out.push({
      slug,
      built,
      loss: findLoss(content, built),
      summary:
        `${built.sections.length} sections, ${built.process.length} steps, ` +
        `${built.documents.length} docs, ${built.pricing.length} prices, ` +
        `${built.differentiators.length} differentiators, ${built.relatedServices.length} related, ` +
        `${built.faq.length} FAQs` +
        (built.caseStudy.title ? ', case study' : ', no case study'),
    });
  }

  if (failures.length) {
    throw new Error(`Mapping does not satisfy serviceBodySchema:\n${failures.join('\n')}`);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Merge: built-in content fills gaps, an editor's work is kept
 * ------------------------------------------------------------------ */

/**
 * One seedable field: how to tell it is untouched, and how to copy it across.
 *
 * A table rather than one big object literal so "which fields does --force
 * replace?" has exactly one answer, and so the dry run can name them.
 */
interface FieldSpec {
  label: string;
  isEmpty: (b: ServiceBody) => boolean;
  copy: (from: ServiceBody, to: ServiceBody) => void;
}

type StringKey = 'tag' | 'subtitle' | 'heroDescription' | 'trustBadge';
type ListKey =
  | 'sections'
  | 'process'
  | 'documents'
  | 'pricing'
  | 'differentiators'
  | 'relatedServices'
  | 'faq';

/* Generic in the key, not merely typed as the union: `to[key] = from[key]` on a
 * union-typed key would ask TypeScript to accept a value of one member's type into a
 * slot that could be any member's, which it rightly refuses. */
const stringField = <K extends StringKey>(key: K): FieldSpec => ({
  label: key,
  isEmpty: (b) => b[key] === '',
  copy: (from, to) => {
    to[key] = from[key];
  },
});

const proseField = <K extends keyof ServiceBody['prose']>(key: K): FieldSpec => ({
  label: `prose.${key}`,
  isEmpty: (b) => b.prose[key] === '',
  copy: (from, to) => {
    to.prose[key] = from.prose[key];
  },
});

const listField = <K extends ListKey>(key: K): FieldSpec => ({
  label: key,
  isEmpty: (b) => b[key].length === 0,
  copy: (from, to) => {
    to[key] = from[key];
  },
});

const FIELDS: FieldSpec[] = [
  stringField('tag'),
  stringField('subtitle'),
  stringField('heroDescription'),
  stringField('trustBadge'),
  proseField('overview'),
  proseField('whatIs'),
  proseField('whyImportant'),
  proseField('whoShouldUse'),
  listField('sections'),
  listField('process'),
  listField('documents'),
  listField('pricing'),
  listField('differentiators'),
  listField('relatedServices'),
  listField('faq'),
  {
    // Mirrors the renderer, which only shows the block when `title` is set: a case
    // study with a title is an editor's, whatever else is blank in it.
    label: 'caseStudy',
    isEmpty: (b) => b.caseStudy.title === '',
    copy: (from, to) => {
      to.caseStudy = from.caseStudy;
    },
  },
];

interface Merge {
  next: ServiceBody;
  /** Fields this run will populate. */
  filled: string[];
  /** Fields an editor already filled: kept as they are, or replaced under --force. */
  edited: string[];
}

function mergeBody(existing: ServiceBody, built: ServiceBody, force: boolean): Merge {
  // Clone so `existing` stays available for the "did anything actually change?"
  // comparison, and so every unmapped key (hero, ourServices, logos, stats, cta,
  // seo, breadcrumbLabel) is carried through verbatim.
  const next = structuredClone(existing);
  const filled: string[] = [];
  const edited: string[] = [];

  for (const field of FIELDS) {
    if (field.isEmpty(existing)) {
      field.copy(built, next);
      filled.push(field.label);
    } else {
      edited.push(field.label);
      if (force) field.copy(built, next);
    }
  }

  return { next, filled, edited };
}

/* ------------------------------------------------------------------ *
 * Database
 * ------------------------------------------------------------------ */

const REQUIRED_ENV = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'] as const;

/**
 * The pool, imported on first use and remembered so it can always be closed.
 *
 * Dynamic rather than a top-level import because `lib/db.ts` throws at module load
 * when the credentials are absent — and this script has real work to do first
 * (validating all six mappings) that must not be blocked by a missing `.env`.
 * Remembered because an open pool keeps the process alive: without this, a failed
 * write would print its error and then hang instead of exiting.
 */
let openPool: (typeof import('../lib/db'))['default'] | null = null;

async function getPool() {
  if (!openPool) openPool = (await import('../lib/db')).default;
  return openPool;
}

async function closePool(): Promise<void> {
  if (!openPool) return;
  const p = openPool;
  openPool = null;
  await p.end().catch(() => undefined);
}

function requireDbEnv(): void {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length === 0) return;
  throw new Error(
    `Missing database credentials: ${missing.join(', ')}.\n` +
      'This script writes to a live database, so it will not fall back to the placeholder\n' +
      'credentials in scripts/test-env.ts. Export the real values, or point tsx at a file:\n' +
      '  npx tsx --env-file=.env scripts/seed-service-body.ts'
  );
}

interface TableShape {
  /** Column used to address a single row in UPDATE — the primary key, or `slug`. */
  keyColumn: string;
  slugColumn: string;
  bodyColumn: string;
  activeColumn: string | null;
  notDeleted: string;
}

async function readTableShape(): Promise<TableShape> {
  const { tableColumnMeta, softDeleteFilter } = await import('../lib/schema');
  const meta = await tableColumnMeta(TABLE);

  if (meta.size === 0) {
    throw new Error(
      `Could not read the shape of \`${TABLE}\`. Either the table does not exist or the ` +
        'database is unreachable. Run `npm run db:migrate` and check the credentials.'
    );
  }

  const slug = meta.get('slug');
  const body = meta.get('body');
  if (!slug || !body) {
    const absent = [!slug && 'slug', !body && 'body'].filter(Boolean).join(' and ');
    throw new Error(
      `\`${TABLE}\` has no ${absent} column, so there is nothing to seed into. ` +
        'Run `npm run db:migrate` first.'
    );
  }
  if (body.dataType !== 'json' && !/text|char|blob/.test(body.dataType)) {
    throw new Error(
      `\`${TABLE}.${body.name}\` is ${body.dataType}, which cannot hold a JSON document. ` +
        'Refusing to write.'
    );
  }

  const primaryKeys = [...meta.values()].filter((c) => c.primaryKey);
  // A composite or absent primary key gives no single addressable column, but `slug`
  // is unique in this table's spec and is the key this content is organised by, so it
  // is a correct fallback rather than a guess.
  const keyColumn = primaryKeys.length === 1 ? primaryKeys[0].name : slug.name;

  return {
    keyColumn,
    slugColumn: slug.name,
    bodyColumn: body.name,
    activeColumn: meta.get('is_active')?.name ?? null,
    notDeleted: await softDeleteFilter(TABLE),
  };
}

interface Row {
  keyValue: string | number;
  slug: string;
  body: unknown;
  isActive: unknown;
}

async function fetchRows(shape: TableShape): Promise<Map<string, Row>> {
  const pool = await getPool();
  const columns = [shape.keyColumn, shape.slugColumn, shape.bodyColumn, shape.activeColumn]
    .filter((c): c is string => c !== null)
    .filter((c, i, all) => all.indexOf(c) === i)
    .map(q)
    .join(', ');

  const [rows] = await pool.query(
    `SELECT ${columns} FROM ${q(TABLE)} WHERE ${q(shape.slugColumn)} IN (?)${shape.notDeleted}`,
    [SERVICES.map((s) => s.slug)]
  );

  const out = new Map<string, Row>();
  for (const raw of rows as Record<string, unknown>[]) {
    const slug = String(raw[shape.slugColumn]);
    out.set(slug, {
      keyValue: raw[shape.keyColumn] as string | number,
      slug,
      body: raw[shape.bodyColumn],
      isActive: shape.activeColumn ? raw[shape.activeColumn] : null,
    });
  }
  return out;
}

/** Slugs that exist but were filtered out by `deleted_at IS NULL`. */
async function fetchSoftDeleted(shape: TableShape, absent: string[]): Promise<Set<string>> {
  if (absent.length === 0 || shape.notDeleted === '') return new Set();
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT ${q(shape.slugColumn)} FROM ${q(TABLE)} WHERE ${q(shape.slugColumn)} IN (?)`,
    [absent]
  );
  return new Set((rows as Record<string, unknown>[]).map((r) => String(r[shape.slugColumn])));
}

type Plan =
  | { kind: 'write'; slug: string; row: Row; next: ServiceBody; filled: string[]; edited: string[] }
  | { kind: 'skip'; slug: string; reason: string };

async function buildPlan(mapped: Mapped[], shape: TableShape, force: boolean): Promise<Plan[]> {
  const rows = await fetchRows(shape);
  const softDeleted = await fetchSoftDeleted(
    shape,
    mapped.filter((m) => !rows.has(m.slug)).map((m) => m.slug)
  );

  const plans: Plan[] = [];

  for (const { slug, built } of mapped) {
    const row = rows.get(slug);
    if (!row) {
      plans.push({
        kind: 'skip',
        slug,
        reason: softDeleted.has(slug)
          ? 'row is soft-deleted (deleted_at set) — not seeding a deleted service'
          : `no \`${TABLE}\` row for this slug — run \`npm run db:seed\` or open /admin/services to create it`,
      });
      continue;
    }

    const existing = parseServiceBody(row.body);
    const { next, filled, edited } = mergeBody(existing, built, force);

    if (JSON.stringify(next) === JSON.stringify(existing)) {
      plans.push({
        kind: 'skip',
        slug,
        reason: edited.length
          ? `all ${edited.length} field(s) already hold content — nothing empty to fill` +
            (force ? ' and they already match the built-in copy' : '')
          : 'already matches the built-in content',
      });
      continue;
    }

    // The merged document, not just the mapping, is what gets stored — so it is what
    // gets validated. An existing row can carry keys this script never wrote.
    const check = serviceBodySchema.safeParse(next);
    if (!check.success) {
      const issues = check.error.issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ');
      throw new Error(`Merged body for "${slug}" does not satisfy serviceBodySchema: ${issues}`);
    }

    plans.push({ kind: 'write', slug, row, next: check.data, filled, edited });
  }

  return plans;
}

/* ------------------------------------------------------------------ *
 * Backup / restore
 * ------------------------------------------------------------------ */

interface Backup {
  createdAt: string;
  table: string;
  keyColumn: string;
  bodyColumn: string;
  rows: { slug: string; keyValue: string | number; body: unknown }[];
}

/** JSON columns come back decoded; TEXT columns come back as strings. Both restore. */
function toColumnValue(body: unknown): string | null {
  if (body === null || body === undefined || body === '') return null;
  return typeof body === 'string' ? body : JSON.stringify(body);
}

async function writeBackup(shape: TableShape, targets: Plan[]): Promise<string> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(ROOT, 'backups');
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, `service-body-${stamp}.json`);

  const backup: Backup = {
    createdAt: new Date().toISOString(),
    table: TABLE,
    keyColumn: shape.keyColumn,
    bodyColumn: shape.bodyColumn,
    rows: targets
      .filter((p): p is Extract<Plan, { kind: 'write' }> => p.kind === 'write')
      .map((p) => ({ slug: p.slug, keyValue: p.row.keyValue, body: p.row.body ?? null })),
  };

  await writeFile(target, JSON.stringify(backup, null, 2), 'utf8');
  return path.relative(ROOT, target);
}

async function restore(backupPath: string): Promise<void> {
  requireDbEnv();
  const backup: Backup = JSON.parse(await readFile(path.resolve(ROOT, backupPath), 'utf8'));
  if (!backup.rows || !backup.keyColumn || !backup.bodyColumn) {
    throw new Error(`${backupPath} is not a service-body backup.`);
  }

  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const row of backup.rows) {
      await conn.execute(
        `UPDATE ${q(backup.table || TABLE)} SET ${q(backup.bodyColumn)} = ? WHERE ${q(backup.keyColumn)} = ?`,
        [toColumnValue(row.body), row.keyValue]
      );
      console.log(`  restored ${row.slug}`);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => undefined);
    throw err;
  } finally {
    conn.release();
  }

  console.log(`\nRestored ${backup.rows.length} row(s) from ${backupPath}.`);
}

/* ------------------------------------------------------------------ *
 * Write
 * ------------------------------------------------------------------ */

async function applyPlan(shape: TableShape, plans: Plan[]): Promise<number> {
  const pool = await getPool();
  const conn = await pool.getConnection();
  let updated = 0;
  try {
    // One transaction: either every page's content lands or the database is untouched.
    await conn.beginTransaction();
    for (const plan of plans) {
      if (plan.kind !== 'write') continue;
      await conn.execute(
        `UPDATE ${q(TABLE)} SET ${q(shape.bodyColumn)} = ? WHERE ${q(shape.keyColumn)} = ?`,
        [JSON.stringify(plan.next), plan.row.keyValue]
      );
      updated++;
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => undefined);
    throw err;
  } finally {
    conn.release();
  }
  return updated;
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

const pad = (s: string) => s.padEnd(22);

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const force = args.includes('--force');
  const restoreIndex = args.indexOf('--restore');

  const KNOWN = ['--write', '--force', '--restore'];
  const unknown = args.filter(
    (a, i) =>
      a.startsWith('--') &&
      !KNOWN.includes(a) &&
      // The value after `--restore` is a path, not a flag — but only exempt that
      // position when `--restore` was actually given, or index 0 gets a free pass.
      !(restoreIndex !== -1 && i === restoreIndex + 1)
  );
  if (unknown.length) {
    throw new Error(
      `Unknown flag(s): ${unknown.join(', ')}. Known flags: ${KNOWN.join(', ')}. ` +
        'A run with no flags is already a dry run. See the header comment for usage.'
    );
  }

  if (restoreIndex !== -1) {
    const target = args[restoreIndex + 1];
    if (!target) throw new Error('--restore needs a backup file path');
    await restore(target);
    return;
  }

  /* 1. Mapping. No database involved, so a bad mapping never reaches a live row. */
  const mapped = mapAll();
  console.log(`\nMapping ${mapped.length} service(s) onto serviceBodySchema:\n`);
  let lossy = false;
  for (const m of mapped) {
    console.log(`  ${pad(m.slug)} ok   ${m.summary}`);
    for (const l of m.loss) {
      lossy = true;
      console.log(`  ${pad('')}      ! ${l}`);
    }
  }
  if (lossy) {
    throw new Error(
      'The schema altered content on the way through (see the ! lines above). Refusing to ' +
        'write live SEO copy that would not round-trip.'
    );
  }
  console.log(`\n  All ${mapped.length} mapping(s) validate and round-trip unchanged.`);

  /* 2. Database. */
  requireDbEnv();
  const shape = await readTableShape();
  console.log(
    `\nTable \`${TABLE}\`: addressing rows by \`${shape.keyColumn}\`, writing \`${shape.bodyColumn}\`` +
      `${shape.notDeleted ? ', skipping soft-deleted rows' : ''}.`
  );

  const plans = await buildPlan(mapped, shape, force);
  const writes = plans.filter((p): p is Extract<Plan, { kind: 'write' }> => p.kind === 'write');

  console.log(`\n${write ? 'Plan' : 'Plan (dry run — nothing will be written)'}:\n`);
  for (const plan of plans) {
    if (plan.kind === 'skip') {
      console.log(`  ${pad(plan.slug)} skip   ${plan.reason}`);
      continue;
    }
    console.log(
      `  ${pad(plan.slug)} write  fill ${plan.filled.length} field(s)` +
        (plan.row.isActive === 0 ? '  [row is inactive]' : '')
    );
    if (plan.filled.length) console.log(`  ${pad('')}        + ${plan.filled.join(', ')}`);
    if (plan.edited.length) {
      console.log(
        force
          ? `  ${pad('')}        ! --force REPLACES existing: ${plan.edited.join(', ')}`
          : `  ${pad('')}        = keeping existing: ${plan.edited.join(', ')}`
      );
    }
  }

  const overwrites = plans.filter(
    (p): p is Extract<Plan, { kind: 'write' }> => p.kind === 'write' && p.edited.length > 0
  );
  if (overwrites.length && !force) {
    console.log(
      `\n  ${overwrites.length} row(s) hold content an editor may have written; those fields are ` +
        `being kept.\n  --force would replace them on: ${overwrites.map((p) => p.slug).join(', ')}`
    );
  }
  if (overwrites.length && force) {
    console.log(
      `\n  --force will REPLACE existing content on: ${overwrites.map((p) => p.slug).join(', ')}`
    );
  }

  if (writes.length === 0) {
    console.log('\nNothing to do — every row is already populated or missing.');
    return;
  }

  if (!write) {
    console.log(
      `\nNothing was changed. Re-run with --write to update ${writes.length} row(s) ` +
        '(a backup is written first).'
    );
    return;
  }

  // Backup before mutation, unconditionally: this is a live database and the
  // previous `body` values exist nowhere else.
  const backupPath = await writeBackup(shape, plans);
  console.log(`\nBackup written to ${backupPath}`);

  const updated = await applyPlan(shape, plans);
  console.log(`Updated ${updated} row(s) in \`${TABLE}\`.`);
  console.log(`\nTo undo: npx tsx scripts/seed-service-body.ts --restore ${backupPath}`);
}

main()
  .catch((err) => {
    console.error(`\n${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  // An open mysql2 pool keeps the event loop alive, so this is what makes the
  // script exit at all — including on the failure path.
  .finally(closePool);
