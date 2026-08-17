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

export const serviceBodySchema = z.object({
  hero: heroSchema,
  ourServices: ourServicesSchema,
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
});

export type ServiceBody = z.output<typeof serviceBodySchema>;
export type ServiceHeroContent = ServiceBody['hero'];
export type OurServicesContent = ServiceBody['ourServices'];
export type OurServiceItem = ServiceBody['ourServices']['items'][number];

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
