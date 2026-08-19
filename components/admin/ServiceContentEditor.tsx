'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ImagePlus,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import MediaPicker from '@/components/admin/MediaPicker';
import {
  CheckboxField,
  LABEL_CLASS,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/admin/ui/fields';
import {
  OUR_SERVICE_ICONS,
  type LogoItem,
  type OurServiceItem,
  type ServiceBody,
  type ServiceDifferentiator,
  type ServiceDocumentItem,
  type ServicePricingRow,
  type ServiceProcessStep,
  type ServiceRelated,
  type ServiceStat,
} from '@/lib/service-content';

/**
 * Editor for everything stored in `services.body`: hero media and copy, the "Our
 * Services" section, the logo ticker, the long-form prose, process steps, required
 * documents, pricing, "why us" cards, the case study, FAQ, related services, the
 * closing CTA and per-page SEO.
 *
 * Fully controlled — the parent `ServiceForm` owns the `ServiceBody` value and
 * submits it as `body`, so this component holds no duplicate state that could
 * drift out of sync with what gets saved. The only local state is which tab and
 * which panel are open.
 *
 * Every field is an *override*: `resolveServiceContent()` treats empty as "not
 * edited" and keeps the page's built-in copy, so clearing a field restores the
 * built-in text rather than blanking a section. That is stated in the UI itself
 * because it is not guessable, and it is why there is no per-section on/off
 * switch — the schema has no such field, and faking one here would break the
 * contract the public pages rely on.
 *
 * Adding a field is a three-line change: add it to `serviceBodySchema`, add an
 * input here, read it in the public component.
 */

/** One collapsible panel. Also the accordion key, so only one is ever open. */
type Section =
  | 'hero'
  | 'intro'
  | 'stats'
  | 'prose'
  | 'included'
  | 'differentiators'
  | 'ourServices'
  | 'logos'
  | 'process'
  | 'documents'
  | 'pricing'
  | 'caseStudy'
  | 'faq'
  | 'relatedServices'
  | 'cta'
  | 'seo';

/** Tab groups. A flat scroll of sixteen panels is unnavigable, so they are grouped. */
type TabId = 'hero' | 'copy' | 'sections' | 'process' | 'proof' | 'seo';

/** `first` is opened when the tab is selected, so a switch never lands on a blank column. */
const TABS: { id: TabId; label: string; first: Section }[] = [
  { id: 'hero', label: 'Hero', first: 'hero' },
  { id: 'sections', label: 'Sections', first: 'ourServices' },
  { id: 'copy', label: 'Body copy', first: 'prose' },
  { id: 'process', label: 'Process & pricing', first: 'process' },
  { id: 'proof', label: 'Proof & CTA', first: 'caseStudy' },
  { id: 'seo', label: 'SEO', first: 'seo' },
];


const ICON_OPTIONS = [
  { value: '', label: 'None' },
  ...OUR_SERVICE_ICONS.map((name) => ({ value: name, label: name })),
];

/**
 * Blank rows for every repeater, annotated with the schema's own row types.
 *
 * The annotations are the point: a field added to `serviceBodySchema` breaks this
 * object at compile time instead of silently persisting a row with a missing key.
 * That is exactly how `alt` slipped through when it was added to
 * `ourServiceItemSchema` — an inline literal had no type to check against.
 */
const BLANK: {
  item: OurServiceItem;
  logo: LogoItem;
  stat: ServiceStat;
  step: ServiceProcessStep;
  document: ServiceDocumentItem;
  pricing: ServicePricingRow;
  differentiator: ServiceDifferentiator;
  related: ServiceRelated;
  faq: ServiceBody['faq'][number];
} = {
  item: { title: '', description: '', icon: '', imageUrl: '', alt: '', href: '', badge: '' },
  logo: { imageUrl: '', label: '', href: '' },
  stat: { value: '', label: '' },
  step: { title: '', description: '', timeline: '' },
  document: { text: '', required: true },
  pricing: { service: '', timeline: '', price: '' },
  differentiator: { icon: '', title: '', description: '' },
  related: { slug: '', title: '', summary: '', tag: '' },
  faq: { q: '', a: '' },
};

export default function ServiceContentEditor({
  value,
  onChange,
}: {
  value: ServiceBody;
  onChange: (next: ServiceBody) => void;
}) {
  const [tab, setTab] = useState<TabId>('hero');
  const [open, setOpen] = useState<Section | null>('hero');
  const [picker, setPicker] = useState<null | {
    onPick: (path: string) => void;
  }>(null);

  /** Both bits of chrome every panel needs, so the call sites stay one line each. */
  const panel = (group: TabId, id: Section) => ({
    group,
    activeGroup: tab,
    isOpen: open === id,
    onToggle: () => setOpen(open === id ? null : id),
  });

  const patchHero = (patch: Partial<ServiceBody['hero']>) =>
    onChange({ ...value, hero: { ...value.hero, ...patch } });

  const patchOur = (patch: Partial<ServiceBody['ourServices']>) =>
    onChange({ ...value, ourServices: { ...value.ourServices, ...patch } });

  const patchItem = (index: number, patch: Partial<OurServiceItem>) =>
    patchOur({
      items: value.ourServices.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    const items = [...value.ourServices.items];
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    patchOur({ items });
  };

  const patchLogos = (patch: Partial<ServiceBody['logos']>) =>
    onChange({ ...value, logos: { ...value.logos, ...patch } });

  const patchLogo = (index: number, patch: Partial<LogoItem>) =>
    patchLogos({
      items: value.logos.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });

  const moveLogo = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    const items = [...value.logos.items];
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    patchLogos({ items });
  };

  const openPicker = (onPick: (path: string) => void) => setPicker({ onPick });

  const patchProse = (patch: Partial<ServiceBody['prose']>) =>
    onChange({ ...value, prose: { ...value.prose, ...patch } });

  const patchCaseStudy = (patch: Partial<ServiceBody['caseStudy']>) =>
    onChange({ ...value, caseStudy: { ...value.caseStudy, ...patch } });

  const patchCta = (patch: Partial<ServiceBody['cta']>) =>
    onChange({ ...value, cta: { ...value.cta, ...patch } });

  const patchSeo = (patch: Partial<ServiceBody['seo']>) =>
    onChange({ ...value, seo: { ...value.seo, ...patch } });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-2xl border border-gray-200 bg-white p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setOpen(t.first);
            }}
            aria-current={tab === t.id ? 'true' : undefined}
            className={`rounded-xl px-3.5 py-2 text-xs font-medium transition-colors ${
              tab === t.id
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/*
        Stated once, up front, because it is the one rule that surprises editors:
        every field here overrides built-in page copy, and empty means "not edited".
      */}
      <p className="rounded-xl bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-500">
        Everything below overrides the copy this page already ships with. Leaving a
        field or a list empty keeps the built-in version — clearing one restores the
        built-in text rather than blanking the section on the live site.
      </p>

      {/* ---------------------------------------------------------- Hero ---- */}
      <Panel
        title="Hero & background media"
        subtitle="Background image or video, overlay strength and headline overrides"
        {...panel('hero', 'hero')}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            id="hero_media_type"
            label="Background"
            value={value.hero.mediaType}
            onChange={(e) => patchHero({ mediaType: e.target.value as ServiceBody['hero']['mediaType'] })}
            options={[
              { value: 'none', label: 'Gradient only (no media)' },
              { value: 'image', label: 'Background image' },
              { value: 'video', label: 'Background video' },
            ]}
          />
          <SelectField
            id="hero_align"
            label="Alignment"
            value={value.hero.align}
            onChange={(e) => patchHero({ align: e.target.value as 'left' | 'center' })}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Centered' },
            ]}
          />
        </div>

        {value.hero.mediaType === 'image' && (
          <MediaInput
            label="Background image"
            value={value.hero.imageUrl}
            onChange={(v) => patchHero({ imageUrl: v })}
            onBrowse={() => openPicker((p) => patchHero({ imageUrl: p }))}
            help="Wide, low-detail images work best behind the headline."
          />
        )}

        {value.hero.mediaType === 'video' && (
          <>
            <MediaInput
              label="Background video"
              value={value.hero.videoUrl}
              onChange={(v) => patchHero({ videoUrl: v })}
              onBrowse={() => openPicker((p) => patchHero({ videoUrl: p }))}
              help="MP4 (H.264) plays everywhere. Keep it under ~5 MB — it autoplays muted and loops."
              preview={false}
            />
            <MediaInput
              label="Poster image"
              value={value.hero.posterUrl}
              onChange={(v) => patchHero({ posterUrl: v })}
              onBrowse={() => openPicker((p) => patchHero({ posterUrl: p }))}
              help="Shown while the video loads, and used on its own for mobile visitors — the video is not downloaded there."
            />
          </>
        )}

        {value.hero.mediaType !== 'none' && (
          <div>
            <label htmlFor="hero_overlay" className={LABEL_CLASS}>
              Overlay darkness — {value.hero.overlay}%
            </label>
            <input
              id="hero_overlay"
              type="range"
              min={0}
              max={95}
              step={5}
              value={value.hero.overlay}
              onChange={(e) => patchHero({ overlay: Number(e.target.value) })}
              className="w-full accent-gray-900"
            />
            <p className="mt-1 text-xs text-gray-400">
              Higher values darken the media so the white headline stays readable. 60–75% suits most photos.
            </p>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="hero_eyebrow"
            label="Eyebrow"
            type="text"
            value={value.hero.eyebrow}
            onChange={(e) => patchHero({ eyebrow: e.target.value })}
            maxLength={80}
            placeholder="Falls back to the service tag"
          />
          <TextField
            id="hero_headline"
            label="Headline"
            type="text"
            value={value.hero.headline}
            onChange={(e) => patchHero({ headline: e.target.value })}
            maxLength={200}
            placeholder="Falls back to the service title"
          />
        </div>

        <TextareaField
          id="hero_subheadline"
          label="Sub-headline"
          value={value.hero.subheadline}
          onChange={(e) => patchHero({ subheadline: e.target.value })}
          rows={2}
          maxLength={400}
          showCount
          placeholder="Falls back to the service summary"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="hero_cta_label"
            label="Primary button"
            type="text"
            value={value.hero.ctaLabel}
            onChange={(e) => patchHero({ ctaLabel: e.target.value })}
            maxLength={60}
            placeholder="e.g. Get free assessment"
          />
          <TextField
            id="hero_cta_href"
            label="Primary link"
            type="text"
            value={value.hero.ctaHref}
            onChange={(e) => patchHero({ ctaHref: e.target.value })}
            maxLength={300}
            placeholder="/contact"
          />
          <TextField
            id="hero_sec_label"
            label="Secondary button"
            type="text"
            value={value.hero.secondaryLabel}
            onChange={(e) => patchHero({ secondaryLabel: e.target.value })}
            maxLength={60}
          />
          <TextField
            id="hero_sec_href"
            label="Secondary link"
            type="text"
            value={value.hero.secondaryHref}
            onChange={(e) => patchHero({ secondaryHref: e.target.value })}
            maxLength={300}
          />
        </div>

        <TextField
          id="breadcrumb_label"
          label="Breadcrumb label"
          type="text"
          value={value.breadcrumbLabel}
          onChange={(e) => onChange({ ...value, breadcrumbLabel: e.target.value })}
          maxLength={80}
          help="Shortens the last crumb when the title is long. Falls back to the service title."
        />
      </Panel>

      {/* --------------------------------------------------- Intro copy ---- */}
      <Panel
        title="Intro copy"
        subtitle="Tag, subtitle, hero paragraph and trust badge"
        {...panel('hero', 'intro')}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="body_tag"
            label="Tag"
            type="text"
            value={value.tag}
            onChange={(e) => onChange({ ...value, tag: e.target.value })}
            maxLength={80}
            help="Small label above the page title."
          />
          <TextField
            id="body_trust_badge"
            label="Trust badge"
            type="text"
            value={value.trustBadge}
            onChange={(e) => onChange({ ...value, trustBadge: e.target.value })}
            maxLength={160}
            placeholder="e.g. 500+ products registered"
          />
        </div>

        <TextareaField
          id="body_subtitle"
          label="Subtitle"
          value={value.subtitle}
          onChange={(e) => onChange({ ...value, subtitle: e.target.value })}
          rows={2}
          maxLength={400}
          showCount
        />

        <TextareaField
          id="body_hero_description"
          label="Hero paragraph"
          value={value.heroDescription}
          onChange={(e) => onChange({ ...value, heroDescription: e.target.value })}
          rows={4}
          maxLength={1000}
          showCount
          help="The opening paragraph under the page title."
        />
      </Panel>

      {/* -------------------------------------------------------- Stats ---- */}
      <Panel
        title="Hero stats"
        subtitle={`${value.stats.length} of 6`}
        {...panel('hero', 'stats')}
      >
        <Repeater
          rows={value.stats}
          onRows={(stats) => onChange({ ...value, stats })}
          blank={BLANK.stat}
          label="Stat"
          addLabel="Add stat"
          max={6}
        >
          {(row, i, patch) => (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id={`stat_value_${i}`}
                label="Value"
                type="text"
                value={row.value}
                onChange={(e) => patch({ value: e.target.value })}
                maxLength={40}
                placeholder="e.g. 500+"
              />
              <TextField
                id={`stat_label_${i}`}
                label="Label"
                type="text"
                value={row.label}
                onChange={(e) => patch({ label: e.target.value })}
                maxLength={120}
                placeholder="e.g. Products registered"
              />
            </div>
          )}
        </Repeater>
      </Panel>

      {/* -------------------------------------------------- Our Services ---- */}
      <Panel
        title="“Our Services” section"
        subtitle={`${value.ourServices.items.length} card${value.ourServices.items.length === 1 ? '' : 's'} · ${value.ourServices.layout} layout`}
        {...panel('sections', 'ourServices')}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="our_heading"
            label="Section heading"
            type="text"
            value={value.ourServices.heading}
            onChange={(e) => patchOur({ heading: e.target.value })}
            maxLength={160}
            placeholder="Our services"
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              id="our_layout"
              label="Layout"
              value={value.ourServices.layout}
              onChange={(e) =>
                patchOur({ layout: e.target.value as ServiceBody['ourServices']['layout'] })
              }
              options={[
                { value: 'grid', label: 'Cards' },
                { value: 'list', label: 'Compact list' },
                { value: 'feature', label: 'Alternating rows' },
              ]}
            />
            <SelectField
              id="our_columns"
              label="Columns"
              value={String(value.ourServices.columns)}
              onChange={(e) => patchOur({ columns: Number(e.target.value) })}
              options={[
                { value: '2', label: '2' },
                { value: '3', label: '3' },
                { value: '4', label: '4' },
              ]}
              help={value.ourServices.layout === 'grid' ? undefined : 'Cards layout only'}
            />
          </div>
        </div>

        <TextareaField
          id="our_subheading"
          label="Section intro"
          value={value.ourServices.subheading}
          onChange={(e) => patchOur({ subheading: e.target.value })}
          rows={2}
          maxLength={400}
          showCount
        />

        <div className="space-y-3">
          {value.ourServices.items.map((item, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Card {i + 1}</span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveItem(i, -1)}
                    disabled={i === 0}
                    className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-white disabled:opacity-30"
                    aria-label={`Move card ${i + 1} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(i, 1)}
                    disabled={i === value.ourServices.items.length - 1}
                    className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-white disabled:opacity-30"
                    aria-label={`Move card ${i + 1} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => patchOur({ items: value.ourServices.items.filter((_, x) => x !== i) })}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove card ${i + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id={`item_title_${i}`}
                  label="Title"
                  type="text"
                  value={item.title}
                  onChange={(e) => patchItem(i, { title: e.target.value })}
                  maxLength={160}
                />
                <div className="grid grid-cols-2 gap-3">
                  <SelectField
                    id={`item_icon_${i}`}
                    label="Icon"
                    value={item.icon}
                    onChange={(e) => patchItem(i, { icon: e.target.value })}
                    options={ICON_OPTIONS}
                  />
                  <TextField
                    id={`item_badge_${i}`}
                    label="Badge"
                    type="text"
                    value={item.badge}
                    onChange={(e) => patchItem(i, { badge: e.target.value })}
                    maxLength={40}
                  />
                </div>
              </div>

              <div className="mt-4">
                <TextareaField
                  id={`item_desc_${i}`}
                  label="Description"
                  value={item.description}
                  onChange={(e) => patchItem(i, { description: e.target.value })}
                  rows={2}
                  maxLength={400}
                  showCount
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TextField
                  id={`item_href_${i}`}
                  label="Link (optional)"
                  type="text"
                  value={item.href}
                  onChange={(e) => patchItem(i, { href: e.target.value })}
                  maxLength={300}
                  placeholder="/services/…"
                />
                <div className="space-y-3">
                  <MediaInput
                    label="Image"
                    value={item.imageUrl}
                    onChange={(v) => patchItem(i, { imageUrl: v })}
                    onBrowse={() => openPicker((p) => patchItem(i, { imageUrl: p }))}
                    help="Used by the alternating-rows layout."
                    compact
                  />
                  <TextField
                    id={`item_alt_${i}`}
                    label="Image alt text"
                    type="text"
                    value={item.alt}
                    onChange={(e) => patchItem(i, { alt: e.target.value })}
                    maxLength={200}
                    help="Describes the picture for screen readers and when the image fails to load. Falls back to the title when blank."
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            disabled={value.ourServices.items.length >= 24}
            onClick={() =>
              patchOur({
                items: [...value.ourServices.items, { ...BLANK.item }],
              })
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add card
          </button>
          {value.ourServices.items.length >= 24 && (
            <p className="text-xs text-amber-600">Maximum of 24 cards reached.</p>
          )}
        </div>
      </Panel>

      {/* ---------------------------------------------------------- Logos ---- */}
      <Panel
        title="Logo ticker"
        subtitle={`${value.logos.items.length} logo${value.logos.items.length === 1 ? '' : 's'} · ${
          value.logos.grayscale ? 'greyscale' : 'full colour'
        } · ${value.logos.speed}s loop`}
        {...panel('sections', 'logos')}
      >
        <p className="rounded-xl bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-500">
          Every logo is scaled to fit the same fixed box on the page, so uploads of
          different shapes and sizes still line up evenly — you do not need to resize
          them first. Transparent PNG or SVG gives the cleanest result. Leave this
          empty to keep the four authority logos the pages ship with.
        </p>

        <TextField
          id="logos_heading"
          label="Strip heading"
          type="text"
          value={value.logos.heading}
          onChange={(e) => patchLogos({ heading: e.target.value })}
          maxLength={160}
          placeholder="e.g. Approved by"
          help="Optional small caption above the logos."
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="logos_speed" className={LABEL_CLASS}>
              Scroll speed — {value.logos.speed}s per loop
            </label>
            <input
              id="logos_speed"
              type="range"
              min={10}
              max={120}
              step={2}
              value={value.logos.speed}
              onChange={(e) => patchLogos({ speed: Number(e.target.value) })}
              className="w-full accent-gray-900"
            />
            <p className="mt-1 text-xs text-gray-400">
              Lower is faster. The strip pauses while a visitor hovers it.
            </p>
          </div>

          <div>
            <span className={LABEL_CLASS}>Colour</span>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 px-4 py-3">
              <input
                type="checkbox"
                checked={value.logos.grayscale}
                onChange={(e) => patchLogos({ grayscale: e.target.checked })}
                className="mt-0.5 h-4 w-4 accent-gray-900"
              />
              <span className="text-xs leading-relaxed text-gray-600">
                <span className="block font-medium text-gray-900">Show in greyscale</span>
                Off by default, so logos appear in their real brand colours.
              </span>
            </label>
          </div>
        </div>

        <div className="space-y-3">
          {value.logos.items.map((logo, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Logo {i + 1}</span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveLogo(i, -1)}
                    disabled={i === 0}
                    className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-white disabled:opacity-30"
                    aria-label={`Move logo ${i + 1} left`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLogo(i, 1)}
                    disabled={i === value.logos.items.length - 1}
                    className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-white disabled:opacity-30"
                    aria-label={`Move logo ${i + 1} right`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => patchLogos({ items: value.logos.items.filter((_, x) => x !== i) })}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove logo ${i + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <MediaInput
                label="Logo file"
                value={logo.imageUrl}
                onChange={(v) => patchLogo(i, { imageUrl: v })}
                onBrowse={() => openPicker((p) => patchLogo(i, { imageUrl: p }))}
                compact
                contain
              />

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TextField
                  id={`logo_label_${i}`}
                  label="Name"
                  type="text"
                  value={logo.label}
                  onChange={(e) => patchLogo(i, { label: e.target.value })}
                  maxLength={80}
                  placeholder="e.g. Dubai Municipality"
                  help="Used as the image's alt text."
                />
                <TextField
                  id={`logo_href_${i}`}
                  label="Link (optional)"
                  type="text"
                  value={logo.href}
                  onChange={(e) => patchLogo(i, { href: e.target.value })}
                  maxLength={300}
                  placeholder="https://…"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            disabled={value.logos.items.length >= 30}
            onClick={() =>
              patchLogos({ items: [...value.logos.items, { ...BLANK.logo }] })
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add logo
          </button>
          {value.logos.items.length >= 30 && (
            <p className="text-xs text-amber-600">Maximum of 30 logos reached.</p>
          )}
        </div>
      </Panel>

      {/* -------------------------------------------------- Long-form copy ---- */}
      <Panel
        title="Long-form copy"
        subtitle="Overview and the three explainer sections"
        {...panel('copy', 'prose')}
      >
        <TextareaField
          id="prose_overview"
          label="Overview"
          value={value.prose.overview}
          onChange={(e) => patchProse({ overview: e.target.value })}
          rows={4}
          maxLength={2000}
          showCount
          help="Plain text — paragraphs, not HTML. Blank lines separate paragraphs."
        />

        <TextField
          id="prose_whatis_heading"
          label="“What is it” heading"
          type="text"
          value={value.prose.whatIsHeading}
          onChange={(e) => patchProse({ whatIsHeading: e.target.value })}
          maxLength={200}
          placeholder="Falls back to the built-in heading"
        />
        <TextareaField
          id="prose_whatis"
          label="“What is it” body"
          value={value.prose.whatIs}
          onChange={(e) => patchProse({ whatIs: e.target.value })}
          rows={6}
          maxLength={4000}
          showCount
        />

        <TextField
          id="prose_why_heading"
          label="“Why it matters” heading"
          type="text"
          value={value.prose.whyImportantHeading}
          onChange={(e) => patchProse({ whyImportantHeading: e.target.value })}
          maxLength={200}
          placeholder="Falls back to the built-in heading"
        />
        <TextareaField
          id="prose_why"
          label="“Why it matters” body"
          value={value.prose.whyImportant}
          onChange={(e) => patchProse({ whyImportant: e.target.value })}
          rows={6}
          maxLength={4000}
          showCount
        />

        <TextField
          id="prose_who_heading"
          label="“Who needs it” heading"
          type="text"
          value={value.prose.whoShouldUseHeading}
          onChange={(e) => patchProse({ whoShouldUseHeading: e.target.value })}
          maxLength={200}
          placeholder="Falls back to the built-in heading"
        />
        <TextareaField
          id="prose_who"
          label="“Who needs it” body"
          value={value.prose.whoShouldUse}
          onChange={(e) => patchProse({ whoShouldUse: e.target.value })}
          rows={6}
          maxLength={4000}
          showCount
        />
      </Panel>

      {/* ------------------------------------------------ What's included ---- */}
      <Panel
        title="“What’s included” list"
        subtitle={`${value.sections.length} bullet${value.sections.length === 1 ? '' : 's'}`}
        {...panel('copy', 'included')}
      >
        <div className="space-y-2">
          {value.sections.map((row, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={row}
                maxLength={300}
                onChange={(e) =>
                  onChange({
                    ...value,
                    sections: value.sections.map((s, x) => (x === i ? e.target.value : s)),
                  })
                }
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10"
                placeholder="e.g. Dubai Municipality product registration"
              />
              <button
                type="button"
                onClick={() => onChange({ ...value, sections: value.sections.filter((_, x) => x !== i) })}
                className="shrink-0 rounded-xl border border-gray-200 px-3 text-gray-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Remove bullet ${i + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={value.sections.length >= 40}
            onClick={() => onChange({ ...value, sections: [...value.sections, ''] })}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add bullet
          </button>
        </div>
      </Panel>

      {/* ----------------------------------------------- Why choose us ---- */}
      <Panel
        title="“Why choose us” cards"
        subtitle={`${value.differentiators.length} of 12`}
        {...panel('copy', 'differentiators')}
      >
        <Repeater
          rows={value.differentiators}
          onRows={(differentiators) => onChange({ ...value, differentiators })}
          blank={BLANK.differentiator}
          label="Reason"
          addLabel="Add reason"
          max={12}
        >
          {(row, i, patch) => (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id={`diff_title_${i}`}
                  label="Title"
                  type="text"
                  value={row.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  maxLength={160}
                />
                <SelectField
                  id={`diff_icon_${i}`}
                  label="Icon"
                  value={row.icon}
                  onChange={(e) => patch({ icon: e.target.value })}
                  options={ICON_OPTIONS}
                />
              </div>
              <div className="mt-4">
                <TextareaField
                  id={`diff_desc_${i}`}
                  label="Description"
                  value={row.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  rows={2}
                  maxLength={600}
                  showCount
                />
              </div>
            </>
          )}
        </Repeater>
      </Panel>

      {/* ------------------------------------------------------ Process ---- */}
      <Panel
        title="Process steps"
        subtitle={`${value.process.length} step${value.process.length === 1 ? '' : 's'}`}
        {...panel('process', 'process')}
      >
        <p className="rounded-xl bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-500">
          Step numbers are not stored — the page numbers the steps 1, 2, 3… from the
          order below, so moving a step renumbers it and everything after it. Use the
          arrows to reorder. Leave the list empty to keep the steps the page ships with.
        </p>

        <Repeater
          rows={value.process}
          onRows={(process) => onChange({ ...value, process })}
          blank={BLANK.step}
          label="Step"
          addLabel="Add step"
          max={20}
        >
          {(row, i, patch) => (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id={`proc_title_${i}`}
                  label={`Title — shows as step ${i + 1}`}
                  type="text"
                  value={row.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  maxLength={200}
                />
                <TextField
                  id={`proc_timeline_${i}`}
                  label="Timeline"
                  type="text"
                  value={row.timeline}
                  onChange={(e) => patch({ timeline: e.target.value })}
                  maxLength={80}
                  placeholder="e.g. 3–5 working days"
                />
              </div>
              <div className="mt-4">
                <TextareaField
                  id={`proc_desc_${i}`}
                  label="Description"
                  value={row.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  rows={3}
                  maxLength={1200}
                  showCount
                />
              </div>
            </>
          )}
        </Repeater>
      </Panel>

      {/* ---------------------------------------------------- Documents ---- */}
      <Panel
        title="Required documents"
        subtitle={`${value.documents.length} document${value.documents.length === 1 ? '' : 's'}`}
        {...panel('process', 'documents')}
      >
        <Repeater
          rows={value.documents}
          onRows={(documents) => onChange({ ...value, documents })}
          blank={BLANK.document}
          label="Document"
          addLabel="Add document"
          max={40}
        >
          {(row, i, patch) => (
            <>
              <TextField
                id={`doc_text_${i}`}
                label="Document"
                type="text"
                value={row.text}
                onChange={(e) => patch({ text: e.target.value })}
                maxLength={300}
                placeholder="e.g. Valid trade licence"
              />
              <div className="mt-3">
                <CheckboxField
                  id={`doc_required_${i}`}
                  label="Required"
                  checked={row.required}
                  onChange={(checked) => patch({ required: checked })}
                  help="Untick for documents that are only needed in some cases."
                />
              </div>
            </>
          )}
        </Repeater>
      </Panel>

      {/* ------------------------------------------------------ Pricing ---- */}
      <Panel
        title="Pricing table"
        subtitle={`${value.pricing.length} row${value.pricing.length === 1 ? '' : 's'}`}
        {...panel('process', 'pricing')}
      >
        <Repeater
          rows={value.pricing}
          onRows={(pricing) => onChange({ ...value, pricing })}
          blank={BLANK.pricing}
          label="Row"
          addLabel="Add row"
          max={20}
        >
          {(row, i, patch) => (
            <>
              <TextField
                id={`price_service_${i}`}
                label="Service"
                type="text"
                value={row.service}
                onChange={(e) => patch({ service: e.target.value })}
                maxLength={200}
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TextField
                  id={`price_timeline_${i}`}
                  label="Timeline"
                  type="text"
                  value={row.timeline}
                  onChange={(e) => patch({ timeline: e.target.value })}
                  maxLength={80}
                  placeholder="e.g. 2–3 weeks"
                />
                <TextField
                  id={`price_price_${i}`}
                  label="Price"
                  type="text"
                  value={row.price}
                  onChange={(e) => patch({ price: e.target.value })}
                  maxLength={80}
                  placeholder="e.g. From AED 4,500"
                  help="Free text, so “On request” works too."
                />
              </div>
            </>
          )}
        </Repeater>
      </Panel>

      {/* --------------------------------------------------- Case study ---- */}
      <Panel
        title="Case study"
        subtitle={value.caseStudy.title || 'Empty — the page keeps its built-in case study'}
        {...panel('proof', 'caseStudy')}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="case_title"
            label="Title"
            type="text"
            value={value.caseStudy.title}
            onChange={(e) => patchCaseStudy({ title: e.target.value })}
            maxLength={200}
            help="The block only appears once this is filled in."
          />
          <TextField
            id="case_client"
            label="Client"
            type="text"
            value={value.caseStudy.client}
            onChange={(e) => patchCaseStudy({ client: e.target.value })}
            maxLength={120}
            placeholder="e.g. A European cosmetics brand"
          />
        </div>

        <TextareaField
          id="case_problem"
          label="Problem"
          value={value.caseStudy.problem}
          onChange={(e) => patchCaseStudy({ problem: e.target.value })}
          rows={3}
          maxLength={1500}
          showCount
        />
        <TextareaField
          id="case_solution"
          label="Solution"
          value={value.caseStudy.solution}
          onChange={(e) => patchCaseStudy({ solution: e.target.value })}
          rows={3}
          maxLength={1500}
          showCount
        />
        <TextareaField
          id="case_result"
          label="Result"
          value={value.caseStudy.result}
          onChange={(e) => patchCaseStudy({ result: e.target.value })}
          rows={3}
          maxLength={1500}
          showCount
        />
        <TextareaField
          id="case_quote"
          label="Client quote"
          value={value.caseStudy.quote}
          onChange={(e) => patchCaseStudy({ quote: e.target.value })}
          rows={3}
          maxLength={800}
          showCount
          help="Without the surrounding quotation marks — the page adds those."
        />
      </Panel>

      {/* ------------------------------------------------------------ FAQ ---- */}
      <Panel
        title="FAQ"
        subtitle={`${value.faq.length} question${value.faq.length === 1 ? '' : 's'}`}
        {...panel('proof', 'faq')}
      >
        <div className="space-y-3">
          {value.faq.map((row, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <div className="mb-3 flex items-center">
                <span className="text-xs font-medium text-gray-500">Question {i + 1}</span>
                <button
                  type="button"
                  onClick={() => onChange({ ...value, faq: value.faq.filter((_, x) => x !== i) })}
                  className="ml-auto rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remove question ${i + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <TextField
                id={`faq_q_${i}`}
                label="Question"
                type="text"
                value={row.q}
                maxLength={300}
                onChange={(e) =>
                  onChange({
                    ...value,
                    faq: value.faq.map((f, x) => (x === i ? { ...f, q: e.target.value } : f)),
                  })
                }
              />
              <div className="mt-3">
                <TextareaField
                  id={`faq_a_${i}`}
                  label="Answer"
                  value={row.a}
                  rows={3}
                  maxLength={2000}
                  showCount
                  onChange={(e) =>
                    onChange({
                      ...value,
                      faq: value.faq.map((f, x) => (x === i ? { ...f, a: e.target.value } : f)),
                    })
                  }
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            disabled={value.faq.length >= 40}
            onClick={() => onChange({ ...value, faq: [...value.faq, { ...BLANK.faq }] })}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add question
          </button>
        </div>
      </Panel>

      {/* --------------------------------------------- Related services ---- */}
      <Panel
        title="Related services"
        subtitle={`${value.relatedServices.length} of 12`}
        {...panel('proof', 'relatedServices')}
      >
        <Repeater
          rows={value.relatedServices}
          onRows={(relatedServices) => onChange({ ...value, relatedServices })}
          blank={BLANK.related}
          label="Service"
          addLabel="Add related service"
          max={12}
        >
          {(row, i, patch) => (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id={`rel_title_${i}`}
                  label="Title"
                  type="text"
                  value={row.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  maxLength={200}
                />
                <TextField
                  id={`rel_slug_${i}`}
                  label="Slug"
                  type="text"
                  value={row.slug}
                  onChange={(e) => patch({ slug: e.target.value })}
                  maxLength={120}
                  placeholder="product-registration"
                  help={`Links to /services/${row.slug || '…'}`}
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TextField
                  id={`rel_tag_${i}`}
                  label="Tag"
                  type="text"
                  value={row.tag}
                  onChange={(e) => patch({ tag: e.target.value })}
                  maxLength={60}
                />
                <TextField
                  id={`rel_summary_${i}`}
                  label="Summary"
                  type="text"
                  value={row.summary}
                  onChange={(e) => patch({ summary: e.target.value })}
                  maxLength={400}
                />
              </div>
            </>
          )}
        </Repeater>
      </Panel>

      {/* ---------------------------------------------------- CTA band ---- */}
      <Panel
        title="Closing call to action"
        subtitle={value.cta.heading || 'Empty — the page keeps its built-in band'}
        {...panel('proof', 'cta')}
      >
        <TextField
          id="cta_heading"
          label="Heading"
          type="text"
          value={value.cta.heading}
          onChange={(e) => patchCta({ heading: e.target.value })}
          maxLength={200}
          placeholder="e.g. Ready to get started?"
        />
        <TextareaField
          id="cta_body"
          label="Body"
          value={value.cta.body}
          onChange={(e) => patchCta({ body: e.target.value })}
          rows={3}
          maxLength={600}
          showCount
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="cta_primary_label"
            label="Primary button"
            type="text"
            value={value.cta.primaryLabel}
            onChange={(e) => patchCta({ primaryLabel: e.target.value })}
            maxLength={60}
          />
          <TextField
            id="cta_primary_href"
            label="Primary link"
            type="text"
            value={value.cta.primaryHref}
            onChange={(e) => patchCta({ primaryHref: e.target.value })}
            maxLength={300}
            placeholder="/contact"
          />
          <TextField
            id="cta_secondary_label"
            label="Secondary button"
            type="text"
            value={value.cta.secondaryLabel}
            onChange={(e) => patchCta({ secondaryLabel: e.target.value })}
            maxLength={60}
          />
          <TextField
            id="cta_secondary_href"
            label="Secondary link"
            type="text"
            value={value.cta.secondaryHref}
            onChange={(e) => patchCta({ secondaryHref: e.target.value })}
            maxLength={300}
          />
        </div>
      </Panel>

      {/* -------------------------------------------------- Search & social ---- */}
      <Panel
        title="Search & social"
        subtitle={
          value.seo.noindex ? 'Hidden from search engines' : 'Meta, OG image and canonical overrides'
        }
        {...panel('seo', 'seo')}
      >
        <TextField
          id="seo_meta_title"
          label="Meta title"
          type="text"
          value={value.seo.metaTitle}
          onChange={(e) => patchSeo({ metaTitle: e.target.value })}
          maxLength={200}
          help="Overrides the Meta title in the SEO card below. Blank uses that one."
        />
        <TextareaField
          id="seo_meta_description"
          label="Meta description"
          value={value.seo.metaDescription}
          onChange={(e) => patchSeo({ metaDescription: e.target.value })}
          rows={3}
          maxLength={400}
          showCount
        />

        <MediaInput
          label="Social share image"
          value={value.seo.ogImage}
          onChange={(v) => patchSeo({ ogImage: v })}
          onBrowse={() => openPicker((p) => patchSeo({ ogImage: p }))}
          help="Shown when the page is shared. 1200×630 is the safe size."
        />

        <TextField
          id="seo_canonical"
          label="Canonical URL"
          type="text"
          value={value.seo.canonicalUrl}
          onChange={(e) => patchSeo({ canonicalUrl: e.target.value })}
          maxLength={300}
          placeholder="https://…"
          help="Only needed when this page duplicates another one."
        />

        <CheckboxField
          id="seo_noindex"
          label="Hide from search engines"
          checked={value.seo.noindex}
          onChange={(checked) => patchSeo({ noindex: checked })}
          help="Adds noindex. The page stays reachable by anyone with the link."
        />
      </Panel>

      {picker && (
        <MediaPicker
          onClose={() => setPicker(null)}
          onSelect={(item) => {
            picker.onPick(item.path ?? '');
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Collapsible card, rendered only when its tab is the active one.
 *
 * Filtering here rather than wrapping each panel in a conditional at the call site
 * keeps every panel at the same indentation and puts a panel's group next to its
 * title. Nothing is lost by unmounting: the parent owns all of the values.
 */
function Panel({
  group,
  activeGroup,
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
}: {
  group: TabId;
  activeGroup: TabId;
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  if (group !== activeGroup) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 px-6 py-4 text-left hover:bg-gray-50"
      >
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-0.5 truncate text-xs text-gray-400">{subtitle}</p>}
        </div>
        <ChevronDown
          className={`ml-auto h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && <div className="space-y-5 border-t border-gray-100 px-6 py-5">{children}</div>}
    </div>
  );
}

/**
 * Add / remove / reorder shell shared by every repeating list in this editor.
 *
 * Generic in the row type, so `blank` must be a *complete* row for the list it is
 * appended to — the missing-`alt` class of bug cannot reach runtime.
 *
 * Reordering is up/down buttons only. There is deliberately no drag handle: the
 * grip icon this file used to render was decorative, which is worse than no
 * affordance at all because it invites a drag that silently does nothing.
 */
function Repeater<T>({
  rows,
  onRows,
  blank,
  label,
  addLabel,
  max,
  children,
}: {
  rows: T[];
  onRows: (rows: T[]) => void;
  blank: T;
  /** Singular row heading — "Card" renders "Card 1", and pluralises for the cap notice. */
  label: string;
  addLabel: string;
  max: number;
  children: (row: T, index: number, patch: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onRows(next);
  };

  const noun = label.toLowerCase();

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">
              {label} {i + 1}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-white disabled:opacity-30"
                aria-label={`Move ${noun} ${i + 1} up`}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === rows.length - 1}
                className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-white disabled:opacity-30"
                aria-label={`Move ${noun} ${i + 1} down`}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onRows(rows.filter((_, x) => x !== i))}
                className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Remove ${noun} ${i + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {children(row, i, (patch) =>
            onRows(rows.map((r, x) => (x === i ? { ...r, ...patch } : r)))
          )}
        </div>
      ))}

      <button
        type="button"
        disabled={rows.length >= max}
        onClick={() => onRows([...rows, { ...blank }])}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" /> {addLabel}
      </button>
      {rows.length >= max && (
        <p className="text-xs text-amber-600">
          Maximum of {max} {noun}s reached.
        </p>
      )}
    </div>
  );
}

/** Text input + Browse button + optional thumbnail, for any media reference. */
function MediaInput({
  label,
  value,
  onChange,
  onBrowse,
  help,
  preview = true,
  compact = false,
  contain = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBrowse: () => void;
  help?: string;
  preview?: boolean;
  compact?: boolean;
  /** Letterbox the thumbnail instead of cropping it — correct for logos. */
  contain?: boolean;
}) {
  const fit = contain ? 'object-contain bg-gray-100 p-3' : 'object-cover';
  return (
    <div>
      <span className={LABEL_CLASS}>{label}</span>
      {preview && value && (
        <div className="relative mb-2 overflow-hidden rounded-xl border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className={`w-full ${compact ? 'h-20' : 'h-32'} ${fit}`}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-gray-700 hover:bg-white"
            aria-label={`Remove ${label}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={500}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-gray-400"
          placeholder="/api/media/… or https://…"
        />
        <button
          type="button"
          onClick={onBrowse}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <ImagePlus className="h-3.5 w-3.5" /> Browse
        </button>
      </div>
      {help && <p className="mt-1 text-xs text-gray-400">{help}</p>}
    </div>
  );
}
