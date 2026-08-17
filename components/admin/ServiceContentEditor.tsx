'use client';

import { useState } from 'react';
import {
  ChevronDown,
  GripVertical,
  ImagePlus,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import MediaPicker from '@/components/admin/MediaPicker';
import { LABEL_CLASS, SelectField, TextField, TextareaField } from '@/components/admin/ui/fields';
import {
  OUR_SERVICE_ICONS,
  type LogoItem,
  type OurServiceItem,
  type ServiceBody,
} from '@/lib/service-content';

/**
 * Editor for everything stored in `services.body`: hero background media, the
 * "Our Services" section, the logo ticker, the "What's included" list and the FAQ.
 *
 * Fully controlled — the parent `ServiceForm` owns the `ServiceBody` value and
 * submits it as `body`, so this component holds no duplicate state that could
 * drift out of sync with what gets saved.
 *
 * Adding a field is a three-line change: add it to `serviceBodySchema`, add an
 * input here, read it in the public component.
 */

type Section = 'hero' | 'ourServices' | 'logos' | 'included' | 'faq';

const ICON_OPTIONS = [
  { value: '', label: 'None' },
  ...OUR_SERVICE_ICONS.map((name) => ({ value: name, label: name })),
];

export default function ServiceContentEditor({
  value,
  onChange,
}: {
  value: ServiceBody;
  onChange: (next: ServiceBody) => void;
}) {
  const [open, setOpen] = useState<Section | null>('hero');
  const [picker, setPicker] = useState<null | {
    onPick: (path: string) => void;
  }>(null);

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

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------- Hero ---- */}
      <Panel
        title="Hero & background media"
        subtitle="Background image or video, overlay strength and headline overrides"
        isOpen={open === 'hero'}
        onToggle={() => setOpen(open === 'hero' ? null : 'hero')}
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

      {/* -------------------------------------------------- Our Services ---- */}
      <Panel
        title="“Our Services” section"
        subtitle={`${value.ourServices.items.length} card${value.ourServices.items.length === 1 ? '' : 's'} · ${value.ourServices.layout} layout`}
        isOpen={open === 'ourServices'}
        onToggle={() => setOpen(open === 'ourServices' ? null : 'ourServices')}
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
                <GripVertical className="h-4 w-4 shrink-0 text-gray-300" aria-hidden="true" />
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
                <MediaInput
                  label="Image"
                  value={item.imageUrl}
                  onChange={(v) => patchItem(i, { imageUrl: v })}
                  onBrowse={() => openPicker((p) => patchItem(i, { imageUrl: p }))}
                  help="Used by the alternating-rows layout."
                  compact
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            disabled={value.ourServices.items.length >= 24}
            onClick={() =>
              patchOur({
                items: [
                  ...value.ourServices.items,
                  { title: '', description: '', icon: '', imageUrl: '', href: '', badge: '' },
                ],
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
        isOpen={open === 'logos'}
        onToggle={() => setOpen(open === 'logos' ? null : 'logos')}
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
                <GripVertical className="h-4 w-4 shrink-0 text-gray-300" aria-hidden="true" />
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
              patchLogos({ items: [...value.logos.items, { imageUrl: '', label: '', href: '' }] })
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

      {/* ------------------------------------------------ What's included ---- */}
      <Panel
        title="“What’s included” list"
        subtitle={`${value.sections.length} bullet${value.sections.length === 1 ? '' : 's'}`}
        isOpen={open === 'included'}
        onToggle={() => setOpen(open === 'included' ? null : 'included')}
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

      {/* ------------------------------------------------------------ FAQ ---- */}
      <Panel
        title="FAQ"
        subtitle={`${value.faq.length} question${value.faq.length === 1 ? '' : 's'}`}
        isOpen={open === 'faq'}
        onToggle={() => setOpen(open === 'faq' ? null : 'faq')}
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
            onClick={() => onChange({ ...value, faq: [...value.faq, { q: '', a: '' }] })}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add question
          </button>
        </div>
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

/** Collapsible card. Keeps a long form navigable without a separate tab bar. */
function Panel({
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
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
