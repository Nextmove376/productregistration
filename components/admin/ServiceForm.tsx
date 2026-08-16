'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, AlertCircle, ImagePlus, X, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/client-api';
import MediaPicker from '@/components/admin/MediaPicker';
import {
  CheckboxField,
  Field,
  LABEL_CLASS,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/admin/ui/fields';

export interface ServiceFormValues {
  id?: number;
  title: string;
  slug: string;
  tag: string;
  summary: string;
  icon: string;
  hero_image: string;
  og_image: string;
  sort_order: number;
  is_active: number;
  meta_title: string;
  meta_description: string;
}

const EMPTY: ServiceFormValues = {
  title: '',
  slug: '',
  tag: '',
  summary: '',
  icon: '',
  hero_image: '',
  og_image: '',
  sort_order: 0,
  is_active: 1,
  meta_title: '',
  meta_description: '',
};

/** Lucide names used by the public service cards. */
const ICON_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'Package', label: 'Package' },
  { value: 'ShieldCheck', label: 'Shield Check' },
  { value: 'Building2', label: 'Building' },
  { value: 'FileCheck', label: 'File Check' },
  { value: 'Stethoscope', label: 'Stethoscope' },
  { value: 'Stamp', label: 'Stamp' },
  { value: 'Globe', label: 'Globe' },
  { value: 'Briefcase', label: 'Briefcase' },
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

export default function ServiceForm({
  initial,
  mode,
}: {
  initial?: Partial<ServiceFormValues>;
  mode: 'create' | 'edit';
}) {
  const router = useRouter();
  const [form, setForm] = useState<ServiceFormValues>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [slugLocked, setSlugLocked] = useState(mode === 'edit');
  const [picker, setPicker] = useState<null | 'hero' | 'og'>(null);

  const set = <K extends keyof ServiceFormValues>(key: K, value: ServiceFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (slugLocked) return;
    setForm((prev) => ({ ...prev, slug: slugify(prev.title) }));
  }, [form.title, slugLocked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});

    try {
      if (mode === 'create') {
        await api.post('/api/admin/services', form);
      } else {
        await api.put(`/api/admin/services/${initial?.id}`, form);
      }
      router.push('/admin/services');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        const details = err.details as any;
        if (Array.isArray(details)) {
          const map: Record<string, string> = {};
          for (const issue of details) {
            const key = Array.isArray(issue.path) ? issue.path[0] : issue.path;
            if (key) map[String(key)] = issue.message;
          }
          setFieldErrors(map);
        } else if (details?.field) {
          setFieldErrors({ [details.field]: err.message });
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin/services"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
          aria-label="Back to services"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {mode === 'create' ? 'New Service' : 'Edit Service'}
        </h1>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="title"
              label="Title"
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              error={fieldErrors.title}
              required
            />
            <div>
              <label htmlFor="slug" className={LABEL_CLASS}>
                Slug <span className="ml-1 text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="slug"
                  type="text"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugLocked(true);
                    set('slug', e.target.value);
                  }}
                  pattern="[a-z0-9-]+"
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10"
                />
                {slugLocked && (
                  <button
                    type="button"
                    onClick={() => {
                      setSlugLocked(false);
                      set('slug', slugify(form.title));
                    }}
                    className="shrink-0 rounded-xl border border-gray-200 px-3 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Auto
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-400">/services/{form.slug || 'your-service'}</p>
              {fieldErrors.slug && <p className="mt-1 text-xs text-red-600">{fieldErrors.slug}</p>}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <TextField
              id="tag"
              label="Tag"
              type="text"
              value={form.tag}
              onChange={(e) => set('tag', e.target.value)}
              maxLength={50}
              error={fieldErrors.tag}
            />
            {/* `icon` was in component state but had no input rendered. */}
            <SelectField
              id="icon"
              label="Icon"
              value={form.icon}
              onChange={(e) => set('icon', e.target.value)}
              options={ICON_OPTIONS}
              error={fieldErrors.icon}
            />
            <TextField
              id="sort_order"
              label="Sort order"
              type="number"
              min={0}
              value={form.sort_order}
              onChange={(e) => set('sort_order', Number.parseInt(e.target.value, 10) || 0)}
              error={fieldErrors.sort_order}
            />
          </div>

          <TextareaField
            id="summary"
            label="Summary"
            value={form.summary}
            onChange={(e) => set('summary', e.target.value)}
            rows={3}
            maxLength={500}
            showCount
            error={fieldErrors.summary}
          />

          {/* Also previously missing from the form. */}
          <CheckboxField
            id="is_active"
            label="Active"
            help="Inactive services are hidden from the public site and sitemap."
            checked={Boolean(form.is_active)}
            onChange={(checked) => set('is_active', checked ? 1 : 0)}
          />
        </div>

        <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900">Images</h2>

          <Field id="hero_image" label="Hero image">
            <ImageField
              value={form.hero_image}
              onPick={() => setPicker('hero')}
              onClear={() => set('hero_image', '')}
              onChange={(v) => set('hero_image', v)}
            />
          </Field>

          <Field id="og_image" label="OG image">
            <ImageField
              value={form.og_image}
              onPick={() => setPicker('og')}
              onClear={() => set('og_image', '')}
              onChange={(v) => set('og_image', v)}
            />
          </Field>
        </div>

        {/* meta_title / meta_description were in state with no inputs either. */}
        <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900">SEO</h2>
          <TextField
            id="meta_title"
            label="Meta title"
            type="text"
            value={form.meta_title}
            onChange={(e) => set('meta_title', e.target.value)}
            maxLength={200}
            placeholder={form.title}
            error={fieldErrors.meta_title}
          />
          <TextareaField
            id="meta_description"
            label="Meta description"
            value={form.meta_description}
            onChange={(e) => set('meta_description', e.target.value)}
            rows={2}
            maxLength={300}
            showCount
            error={fieldErrors.meta_description}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : mode === 'create' ? 'Create service' : 'Save changes'}
          </button>
          <Link
            href="/admin/services"
            className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>

      {picker && (
        <MediaPicker
          onClose={() => setPicker(null)}
          onSelect={(item) => {
            set(picker === 'hero' ? 'hero_image' : 'og_image', item.path ?? '');
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

function ImageField({
  value,
  onPick,
  onClear,
  onChange,
}: {
  value: string;
  onPick: () => void;
  onClear: () => void;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      {value ? (
        <div className="relative mb-2 overflow-hidden rounded-xl border border-gray-200">
          <img src={value} alt="" className="h-32 w-full object-cover" />
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-gray-700 hover:bg-white"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-gray-400"
          placeholder="/api/media/…"
        />
        <button
          type="button"
          onClick={onPick}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <ImagePlus className="h-3.5 w-3.5" /> Browse
        </button>
      </div>
    </div>
  );
}
