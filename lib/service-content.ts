import { z } from 'zod';

/**
 * The editable content model for a service page.
 *
 * All of this lives in the existing `services.body` JSON column — deliberately,
 * so adding hero video, background media and the "Our Services" section needs no
 * schema migration. Adding a new field here is the only step required to make it
 * editable in the admin and renderable on the public page.
 *
 * Everything is optional with a default, which gives two properties the public
 * pages depend on:
 *
 *  1. `parseServiceBody()` can never throw and always returns a fully-populated
 *     object, so the page renders with no defensive `?.` chains.
 *  2. Rows written before this model existed (`{ sections, faq }`) keep working
 *     untouched — they simply pick up defaults for the new keys.
 *
 * Validation is lenient about *content* (no required strings) and strict about
 * *size* (max lengths, array caps). Empty entries are stripped on write by the
 * transforms below rather than rejected, so a half-filled repeater row in the
 * admin never blocks a save — it just doesn't persist.
 */

/** A site-relative media path or an absolute http(s) URL. */
const mediaRef = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//i.test(v), {
    message: 'Must be a site-relative path or an absolute http(s) URL',
  })
  .optional()
  .default('');

/** Bounded free text that defaults to empty rather than being required. */
const text = (max: number) => z.string().trim().max(max).optional().default('');

export const HERO_MEDIA_TYPES = ['none', 'image', 'video'] as const;
export const OUR_SERVICES_LAYOUTS = ['grid', 'list', 'feature'] as const;

/**
 * Icon names offered for "Our Services" cards.
 *
 * Lives here rather than next to the icon map in
 * `components/services/OurServices.tsx` so the admin editor (a Client Component)
 * can list them without importing that Server Component — which would pull every
 * referenced lucide icon into the browser bundle. `ITEM_ICONS` there is keyed by
 * exactly these names; adding one means adding it in both places.
 */
export const OUR_SERVICE_ICONS = [
  'Package',
  'ShieldCheck',
  'Building2',
  'FileCheck',
  'Stethoscope',
  'Stamp',
  'Globe',
  'Briefcase',
  'Award',
  'ClipboardCheck',
  'ScrollText',
  'Truck',
  'CheckCircle2',
] as const;

/**
 * Hero / background media.
 *
 * `overlay` is a percentage of darkening laid over the media so the headline
 * stays legible on any image the editor picks — capped at 95 so the media never
 * becomes entirely invisible, and floored at 0 for a clean image.
 */
export const heroSchema = z
  .object({
    mediaType: z.enum(HERO_MEDIA_TYPES).optional().default('none'),
    imageUrl: mediaRef,
    videoUrl: mediaRef,
    /** Still frame shown while the video loads, and the fallback on mobile. */
    posterUrl: mediaRef,
    overlay: z.coerce.number().min(0).max(95).optional().default(65),
    align: z.enum(['left', 'center']).optional().default('left'),
    /** Optional copy overrides — blank falls back to the service's own fields. */
    eyebrow: text(80),
    headline: text(200),
    subheadline: text(400),
    ctaLabel: text(60),
    ctaHref: text(300),
    secondaryLabel: text(60),
    secondaryHref: text(300),
  })
  .optional()
  .default({});

export const ourServiceItemSchema = z.object({
  title: text(160),
  description: text(400),
  /** Lucide icon name — see ITEM_ICONS in components/services/OurServices.tsx. */
  icon: text(60),
  imageUrl: mediaRef,
  /**
   * Alt text for `imageUrl`.
   *
   * Separate from `title` because the two say different things: the title is the
   * service name, the alt text describes the picture. The renderer falls back to
   * `title` when this is blank, which is what it used unconditionally before —
   * so existing rows are unaffected and nothing ever ships with an empty `alt`.
   */
  alt: text(200),
  href: text(300),
  badge: text(40),
});

export const ourServicesSchema = z
  .object({
    heading: text(160),
    subheading: text(400),
    layout: z.enum(OUR_SERVICES_LAYOUTS).optional().default('grid'),
    columns: z.coerce.number().int().min(2).max(4).optional().default(3),
    items: z
      .array(ourServiceItemSchema)
      .max(24)
      .optional()
      .default([])
      // A repeater row the editor added but never filled in is dropped, not saved.
      .transform((items) => items.filter((i) => i.title !== '' || i.description !== '')),
  })
  .optional()
  .default({});

export const logoItemSchema = z.object({
  imageUrl: mediaRef,
  /** Used as the `alt` text, so it should name the authority or partner. */
  label: text(80),
  href: text(300),
});

/**
 * Logo ticker ("trust bar").
 *
 * The hardcoded version this replaces had three problems the editor could not
 * fix: the logos were `grayscale` so every brand rendered black, they were sized
 * by height alone so wildly different aspect ratios looked uneven, and the strip
 * did not actually move. Colour is now the default, sizing is handled by a fixed
 * box per logo in `LogoTicker`, and `speed` drives a real animation.
 */
export const logosSchema = z
  .object({
    heading: text(160),
    /** Off by default — the old strip forced every logo to render black. */
    grayscale: z.boolean().optional().default(false),
    /** Seconds for one full loop. Lower is faster. */
    speed: z.coerce.number().int().min(10).max(120).optional().default(38),
    items: z
      .array(logoItemSchema)
      .max(30)
      .optional()
      .default([])
      // A logo row with no image is meaningless, so it is never saved.
      .transform((rows) => rows.filter((r) => r.imageUrl !== '')),
  })
  .optional()
  .default({});

/**
 * Bounded list helper: caps length, drops rows the editor never filled in.
 *
 * Every list below is empty-by-default rather than required, which is what makes
 * the fallback rule in `resolveServiceContent()` work — an untouched section is
 * indistinguishable from one that was never edited, so the page keeps its
 * built-in content instead of rendering a blank strip.
 */
const list = <T extends z.ZodTypeAny>(item: T, max: number, keep: (row: z.output<T>) => boolean) =>
  z
    .array(item)
    .max(max)
    .optional()
    .default([])
    .transform((rows) => (rows as z.output<T>[]).filter(keep));

/** Numbered process step. Mirrors `ProcessStep` in ServicePageLayout. */
export const processStepSchema = z.object({
  title: text(200),
  description: text(1200),
  /** Free text ("3-5 working days") rather than a number — it is copy, not data. */
  timeline: text(80),
});

/** Required-document row. Mirrors `Document`. */
export const documentItemSchema = z.object({
  text: text(300),
  required: z.boolean().optional().default(true),
});

/** Pricing table row. Mirrors `PricingRow`. Prices stay strings ("From AED 4,500"). */
export const pricingRowSchema = z.object({
  service: text(200),
  timeline: text(80),
  price: text(80),
});

/** "Why us" card. Mirrors `differentiators`. */
export const differentiatorSchema = z.object({
  icon: text(60),
  title: text(160),
  description: text(600),
});

/** Related-service card. Mirrors `RelatedService`. */
export const relatedServiceSchema = z.object({
  slug: text(120),
  title: text(200),
  summary: text(400),
  tag: text(60),
});

/** Stat shown in the hero strip. */
export const statSchema = z.object({
  value: text(40),
  label: text(120),
});

/**
 * Case study. Every field optional, but the renderer only shows the block when
 * `title` is set — a half-filled case study is worse than none.
 */
export const caseStudySchema = z
  .object({
    title: text(200),
    problem: text(1500),
    solution: text(1500),
    result: text(1500),
    quote: text(800),
    client: text(120),
  })
  .optional()
  .default({});

/** Closing call-to-action band. */
export const ctaSchema = z
  .object({
    heading: text(200),
    body: text(600),
    primaryLabel: text(60),
    primaryHref: text(300),
    secondaryLabel: text(60),
    secondaryHref: text(300),
  })
  .optional()
  .default({});

/**
 * Long-form prose sections. Mirrors `whatIs` / `whyImportant` / `whoShouldUse`.
 *
 * Plain text, not HTML: these render as paragraphs, and accepting HTML here would
 * open a stored-XSS path on a public page for no editorial benefit.
 */
export const proseSchema = z
  .object({
    overview: text(2000),
    whatIs: text(4000),
    whatIsHeading: text(200),
    whyImportant: text(4000),
    whyImportantHeading: text(200),
    whoShouldUse: text(4000),
    whoShouldUseHeading: text(200),
  })
  .optional()
  .default({});

/** Per-page SEO overrides. Blank falls back to the service row's own columns. */
export const serviceSeoSchema = z
  .object({
    metaTitle: text(200),
    metaDescription: text(400),
    ogImage: mediaRef,
    canonicalUrl: text(300),
    noindex: z.boolean().optional().default(false),
  })
  .optional()
  .default({});

export const serviceBodySchema = z.object({
  hero: heroSchema,
  ourServices: ourServicesSchema,
  logos: logosSchema,
  /** "What's included" bullet list. Pre-existing shape, unchanged. */
  sections: z
    .array(z.string().trim().max(300))
    .max(40)
    .optional()
    .default([])
    .transform((rows) => rows.filter((r) => r !== '')),
  faq: z
    .array(z.object({ q: text(300), a: text(2000) }))
    .max(40)
    .optional()
    .default([])
    .transform((rows) => rows.filter((r) => r.q !== '')),
  /** Overrides the breadcrumb trail label; falls back to the service title. */
  breadcrumbLabel: text(80),

  /* The sections below were hardcoded per-page until now. See the fallback rule
   * in `resolveServiceContent()`: empty means "keep what the page already has",
   * never "render nothing". */
  prose: proseSchema,
  heroDescription: text(1000),
  trustBadge: text(160),
  tag: text(80),
  subtitle: text(400),
  stats: list(statSchema, 6, (r) => r.value !== '' || r.label !== ''),
  process: list(processStepSchema, 20, (r) => r.title !== ''),
  documents: list(documentItemSchema, 40, (r) => r.text !== ''),
  pricing: list(pricingRowSchema, 20, (r) => r.service !== ''),
  differentiators: list(differentiatorSchema, 12, (r) => r.title !== ''),
  relatedServices: list(relatedServiceSchema, 12, (r) => r.title !== '' || r.slug !== ''),
  caseStudy: caseStudySchema,
  cta: ctaSchema,
  seo: serviceSeoSchema,
});

export type ServiceBody = z.output<typeof serviceBodySchema>;
export type ServiceHeroContent = ServiceBody['hero'];
export type OurServicesContent = ServiceBody['ourServices'];
export type LogosContent = ServiceBody['logos'];
export type LogoItem = LogosContent['items'][number];
export type OurServiceItem = ServiceBody['ourServices']['items'][number];
export type ServiceProcessStep = ServiceBody['process'][number];
export type ServiceDocumentItem = ServiceBody['documents'][number];
export type ServicePricingRow = ServiceBody['pricing'][number];
export type ServiceDifferentiator = ServiceBody['differentiators'][number];
export type ServiceRelated = ServiceBody['relatedServices'][number];
export type ServiceStat = ServiceBody['stats'][number];

/**
 * The subset of a service page's props that admin content can override.
 *
 * Declared structurally, and `resolveServiceContent` is generic over it, so the
 * six statically-defined pages keep their own richer `ServicePageData` type and
 * nothing has to move out of `components/services/ServicePageLayout.tsx`. A lib
 * module importing a type from a Server Component would be the wrong direction.
 */
export interface ResolvableServiceData {
  tag: string;
  subtitle: string;
  heroDescription: string;
  trustBadge?: string;
  overview: string;
  whatIs: string;
  whyImportant: string;
  whoShouldUse: string;
  process: { step: number; title: string; description: string; timeline: string }[];
  included: string[];
  documents: { text: string; required?: boolean }[];
  pricing: { service: string; timeline: string; price: string }[];
  differentiators: { icon: string; title: string; description: string }[];
  caseStudy?: {
    title: string;
    problem: string;
    solution: string;
    result: string;
    quote?: string;
    client?: string;
  };
  faq: { question: string; answer: string }[];
  relatedServices: { slug: string; title: string; summary: string; tag: string }[];
}

/** Admin value wins when it has been filled in; otherwise keep the built-in one. */
const orKeep = (edited: string, current: string): string => (edited === '' ? current : edited);

/**
 * Merges admin-edited content over a page's built-in content.
 *
 * **The rule, and the reason for it:** an empty field or empty list means "not
 * edited", so the page keeps what it already had. It never means "render an empty
 * section". The six live service pages ship with substantial hardcoded copy, and
 * every one of them has a `services` row whose `body` starts out `NULL`. If empty
 * won, publishing this change would blank six live pages at once.
 *
 * The consequence is that content is editable but not *deletable* from the admin:
 * clearing a field restores the built-in text rather than removing the section.
 * That is the safe direction for a live site, and `scripts/seed-service-body.ts`
 * removes the asymmetry by importing the built-in copy into the database, after
 * which the admin holds the real content and editing it is fully in control.
 */
export function resolveServiceContent<T extends ResolvableServiceData>(
  data: T,
  body: ServiceBody
): T {
  const p = body.prose;

  return {
    ...data,
    tag: orKeep(body.tag, data.tag),
    subtitle: orKeep(body.subtitle, data.subtitle),
    heroDescription: orKeep(body.heroDescription, data.heroDescription),
    // Optional on the page, so an empty result becomes `undefined` and the badge
    // is omitted rather than rendered as an empty pill.
    trustBadge: orKeep(body.trustBadge, data.trustBadge ?? '') || undefined,
    overview: orKeep(p.overview, data.overview),
    whatIs: orKeep(p.whatIs, data.whatIs),
    whyImportant: orKeep(p.whyImportant, data.whyImportant),
    whoShouldUse: orKeep(p.whoShouldUse, data.whoShouldUse),

    // `step` is presentational and always 1..n in document order, so it is derived
    // here rather than stored — one less field for an editor to get wrong.
    process: body.process.length
      ? body.process.map((s, i) => ({
          step: i + 1,
          title: s.title,
          description: s.description,
          timeline: s.timeline,
        }))
      : data.process,

    included: body.sections.length ? body.sections : data.included,
    documents: body.documents.length ? body.documents : data.documents,
    pricing: body.pricing.length ? body.pricing : data.pricing,
    differentiators: body.differentiators.length ? body.differentiators : data.differentiators,
    relatedServices: body.relatedServices.length ? body.relatedServices : data.relatedServices,

    // Stored as {q,a} since before this model existed; the page renders
    // {question,answer}. Mapped here so neither side has to change.
    faq: body.faq.length
      ? body.faq.map((f) => ({ question: f.q, answer: f.a }))
      : data.faq,

    caseStudy: body.caseStudy.title !== '' ? body.caseStudy : data.caseStudy,
  };
}

/** A fully-defaulted body, used when a row has no content at all. */
export const EMPTY_SERVICE_BODY: ServiceBody = serviceBodySchema.parse({});

/**
 * Normalise whatever is in the `body` column into a complete `ServiceBody`.
 *
 * Accepts the three shapes that actually occur: a JSON string (mysql2 returns
 * TEXT columns as strings), an already-decoded object (JSON columns), or
 * null/undefined. Never throws — a malformed row degrades to defaults so one bad
 * record cannot take down the services section.
 */
export function parseServiceBody(raw: unknown): ServiceBody {
  if (raw === null || raw === undefined || raw === '') return EMPTY_SERVICE_BODY;

  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return EMPTY_SERVICE_BODY;
    }
  }

  const parsed = serviceBodySchema.safeParse(value);
  return parsed.success ? parsed.data : EMPTY_SERVICE_BODY;
}

/**
 * Does the hero have usable media? Guards against `mediaType: 'video'` with an
 * empty URL, which would otherwise render an empty black box.
 */
export function heroHasMedia(hero: ServiceHeroContent): boolean {
  if (hero.mediaType === 'image') return hero.imageUrl !== '';
  if (hero.mediaType === 'video') return hero.videoUrl !== '' || hero.posterUrl !== '';
  return false;
}
