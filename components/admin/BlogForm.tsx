'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, AlertCircle, Eye, Code2, ImagePlus, X, Loader2, History } from 'lucide-react';
import { api, ApiError } from '@/lib/client-api';
import MediaPicker from '@/components/admin/MediaPicker';

export interface BlogFormValues {
  id?: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  image_alt: string;
  category_id: number | null;
  author: string;
  status: 'draft' | 'published' | 'scheduled';
  published_at: string;
  meta_title: string;
  meta_description: string;
  og_image: string;
  canonical_url: string;
  noindex: number;
}

export interface Category {
  id: number;
  name: string;
}

/** The shape of one zod issue as the API serialises it. */
interface ZodIssueLike {
  path?: unknown;
  message?: unknown;
}

/** Narrows the single-field error shape some handlers return instead of zod issues. */
function isFieldError(value: unknown): value is { field: string } {
  return typeof value === 'object' && value !== null && typeof (value as { field?: unknown }).field === 'string';
}

const EMPTY: BlogFormValues = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  featured_image: '',
  image_alt: '',
  category_id: null,
  author: '',
  status: 'draft',
  published_at: '',
  meta_title: '',
  meta_description: '',
  og_image: '',
  canonical_url: '',
  noindex: 0,
};

/** Mirrors `slugify` in `lib/content.ts` so the client preview matches the server. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

/** MySQL DATETIME needs `YYYY-MM-DD HH:MM:SS`; the input gives `YYYY-MM-DDTHH:MM`. */
function toMysqlDateTime(local: string): string {
  if (!local) return '';
  return local.replace('T', ' ') + (local.length === 16 ? ':00' : '');
}

/**
 * How old an autosaved draft is, in words.
 *
 * The age is the only evidence the editor has for deciding whether the draft or
 * the saved post is the one they want, so it is worth stating plainly rather than
 * printing a raw timestamp.
 */
function draftAge(savedAt: number | null): string {
  if (!savedAt) return 'an earlier session';

  const minutes = Math.floor((Date.now() - savedAt) / 60000);
  if (minutes < 1) return 'moments ago';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

const LABEL = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500';
const INPUT =
  'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10';

export default function BlogForm({
  initial,
  categories,
  mode,
}: {
  initial?: Partial<BlogFormValues>;
  categories: Category[];
  mode: 'create' | 'edit';
}) {
  const router = useRouter();
  const [form, setForm] = useState<BlogFormValues>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [slugLocked, setSlugLocked] = useState(mode === 'edit');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [picker, setPicker] = useState<null | 'featured' | 'og'>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [autosavedAt, setAutosavedAt] = useState<Date | null>(null);

  /**
   * An unsaved draft found in storage that has NOT been applied to the form.
   *
   * Only used in `edit` mode, where the form already holds the saved post and
   * applying a draft automatically would destroy it. Null means either there is
   * no draft or the editor has already chosen what to do with it.
   */
  const [pendingDraft, setPendingDraft] = useState<{
    form: Partial<BlogFormValues>;
    savedAt: number | null;
  } | null>(null);

  const draftKey = useMemo(() => `nm_blog_draft_${mode}_${initial?.id ?? 'new'}`, [mode, initial?.id]);
  const dirtyRef = useRef(false);

  const set = <K extends keyof BlogFormValues>(key: K, value: BlogFormValues[K]) => {
    dirtyRef.current = true;
    // Once the editor starts typing, an unapplied draft offer is stale — the
    // autosave below is about to overwrite the stored copy anyway, and leaving the
    // banner up would offer to restore something that no longer exists.
    setPendingDraft(null);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Auto-generate the slug from the title until the user edits it themselves.
  //
  // This is a setState-in-effect, which the lint rule rightly flags in general. It
  // stays because the slug is genuinely stored state, not derived: once the editor
  // types in the slug field, `slugLocked` freezes whatever is there and the title
  // stops driving it. Computing `slugify(title)` at render instead would need a
  // second source of truth for the locked value and a matching change to the submit
  // payload — more moving parts in a live form for one avoided re-render per keystroke.
  useEffect(() => {
    if (slugLocked) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- slug is stored state gated by slugLocked, not derived
    setForm((prev) => ({ ...prev, slug: slugify(prev.title) }));
  }, [form.title, slugLocked]);

  /**
   * Offer an unsaved draft from a previous session, rather than applying it.
   *
   * This used to call `setForm` unconditionally on mount, which silently
   * overwrote the post that had just been loaded from the database with whatever
   * happened to be in `localStorage` — even when the stored draft was older than
   * the row. Anyone who edited the post from another browser, or whose earlier
   * autosave predated a later save, lost the newer content on open with no
   * indication it had happened.
   *
   * There is no reliable way to tell which side is newer: `BlogFormValues` carries
   * no `updated_at`, so the two timestamps are not comparable. So the editor
   * decides. In `create` mode the form starts empty and there is nothing to
   * clobber, so restoring immediately is still the right behaviour.
   *
   * The setState here cannot be avoided: `localStorage` does not exist during
   * server rendering, so seeding it through a `useState` initialiser would produce
   * different markup on the server and the client and fail hydration. Reading it
   * after mount is the only correct place.
   */
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- see above: localStorage is client-only, so a useState initialiser would break hydration */
    try {
      const stored = window.localStorage.getItem(draftKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!parsed?.form) return;

      if (mode === 'create') {
        setForm((prev) => ({ ...prev, ...parsed.form }));
        setDraftRestored(true);
        setSlugLocked(true);
        return;
      }

      setPendingDraft({
        form: parsed.form as Partial<BlogFormValues>,
        savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : null,
      });
    } catch {
      /* ignore corrupt draft */
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [draftKey, mode]);

  /** Autosave to localStorage so a crash or accidental navigation doesn't lose work. */
  useEffect(() => {
    if (!dirtyRef.current) return;
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey, JSON.stringify({ form, savedAt: Date.now() }));
        setAutosavedAt(new Date());
      } catch {
        /* storage full or unavailable */
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [form, draftKey]);

  /** Warn before losing unsaved changes. */
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const discardDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
    setDraftRestored(false);
    setPendingDraft(null);
  }, [draftKey]);

  /** Apply the offered draft over the loaded post, at the editor's explicit request. */
  const acceptPendingDraft = useCallback(() => {
    if (!pendingDraft) return;
    setForm((prev) => ({ ...prev, ...pendingDraft.form }));
    setSlugLocked(true);
    setDraftRestored(true);
    setPendingDraft(null);
    // Restoring is itself an unsaved change: without this the beforeunload guard
    // would let the editor navigate away and lose the content they just recovered.
    dirtyRef.current = true;
  }, [pendingDraft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});

    const payload = {
      ...form,
      slug: form.slug || slugify(form.title),
      published_at: form.published_at ? toMysqlDateTime(form.published_at) : null,
      category_id: form.category_id || null,
      noindex: form.noindex ? 1 : 0,
    };

    try {
      if (mode === 'create') {
        await api.post('/api/blog', payload);
      } else {
        await api.put(`/api/blog/${initial?.id}`, payload);
      }

      dirtyRef.current = false;
      discardDraft();
      router.push('/admin/blog');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        // Surface per-field messages from the zod issues the API returns.
        //
        // Typed as `unknown` and narrowed rather than cast to `any`: `err.details`
        // is whatever the server chose to send, so every property access here has
        // to be guarded anyway. A cast would only have hidden that from the reader.
        const details: unknown = err.details;
        if (Array.isArray(details)) {
          const map: Record<string, string> = {};
          for (const issue of details as ZodIssueLike[]) {
            const key = Array.isArray(issue.path) ? issue.path[0] : issue.path;
            if (key) map[String(key)] = String(issue.message ?? 'Invalid value');
          }
          setFieldErrors(map);
        } else if (isFieldError(details)) {
          setFieldErrors({ [details.field]: err.message });
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
      setSaving(false);
    }
  };

  const fieldError = (name: string) =>
    fieldErrors[name] ? <p className="mt-1 text-xs text-red-600">{fieldErrors[name]}</p> : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link
          href="/admin/blog"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
          aria-label="Back to posts"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {mode === 'create' ? 'New Blog Post' : 'Edit Blog Post'}
        </h1>
        {autosavedAt && (
          <span className="text-xs text-gray-400">
            Draft saved {autosavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}

        {/*
          The only entry point to revision history. Every save snapshots the previous
          version, so without a link from here that history would exist in the database
          and be unreachable from the UI — which is the same as not having it.
        */}
        {mode === 'edit' && initial?.id && (
          <Link
            href={`/admin/blog/${initial.id}/revisions`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            <History className="h-4 w-4" />
            History
          </Link>
        )}
      </div>

      {pendingDraft && (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-900">
              You have unsaved changes to this post from {draftAge(pendingDraft.savedAt)}.
            </p>
            <p className="mt-1 text-sm text-amber-800">
              The saved version is shown below. Restoring replaces it with your unsaved draft —
              nothing is written until you save.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={acceptPendingDraft}
              className="rounded-lg bg-amber-900 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800"
            >
              Restore draft
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {draftRestored && (
        <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            An unsaved draft was restored from your last session.
          </p>
          <button onClick={discardDraft} className="shrink-0 text-sm font-medium text-blue-700 hover:underline">
            Discard draft
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid max-w-6xl gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
            <div>
              <label htmlFor="title" className={LABEL}>
                Title
              </label>
              <input
                id="title"
                type="text"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                className={INPUT}
                required
              />
              {fieldError('title')}
            </div>

            <div>
              <label htmlFor="slug" className={LABEL}>
                Slug
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
                  className={INPUT}
                  pattern="[a-z0-9-]+"
                  required
                />
                {slugLocked && (
                  <button
                    type="button"
                    onClick={() => {
                      setSlugLocked(false);
                      set('slug', slugify(form.title));
                    }}
                    className="shrink-0 rounded-xl border border-gray-200 px-3 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    title="Regenerate from title"
                  >
                    Auto
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-400">/blog/{form.slug || 'your-post'}</p>
              {fieldError('slug')}
            </div>

            <div>
              <label htmlFor="excerpt" className={LABEL}>
                Excerpt
              </label>
              <textarea
                id="excerpt"
                value={form.excerpt}
                onChange={(e) => set('excerpt', e.target.value)}
                className={INPUT}
                rows={2}
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-400">{form.excerpt.length}/500</p>
              {fieldError('excerpt')}
            </div>

            {/* Write / Preview */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="content" className={LABEL}>
                  Content
                </label>
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => setTab('write')}
                    className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium ${
                      tab === 'write' ? 'bg-white shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    <Code2 className="h-3.5 w-3.5" /> HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('preview')}
                    className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium ${
                      tab === 'preview' ? 'bg-white shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>
                </div>
              </div>

              {tab === 'write' ? (
                <textarea
                  id="content"
                  value={form.content}
                  onChange={(e) => set('content', e.target.value)}
                  className={`${INPUT} font-mono`}
                  rows={18}
                  required
                />
              ) : (
                /**
                 * Preview only. The server sanitizes on save and again on render, so
                 * what actually ships to visitors is never this raw string — but this
                 * is the author's own input in their own session either way.
                 */
                <div
                  className="prose prose-sm min-h-[20rem] max-w-none rounded-xl border border-gray-200 bg-gray-50 p-4"
                  dangerouslySetInnerHTML={{ __html: form.content }}
                />
              )}
              <p className="mt-1 text-xs text-gray-400">
                Disallowed tags and event handlers are stripped on save.
              </p>
              {fieldError('content')}
            </div>
          </div>

          {/* SEO */}
          <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900">SEO</h2>

            <div>
              <label htmlFor="meta_title" className={LABEL}>
                Meta title
              </label>
              <input
                id="meta_title"
                type="text"
                value={form.meta_title}
                onChange={(e) => set('meta_title', e.target.value)}
                className={INPUT}
                maxLength={200}
                placeholder={form.title}
              />
              {fieldError('meta_title')}
            </div>

            <div>
              <label htmlFor="meta_description" className={LABEL}>
                Meta description
              </label>
              <textarea
                id="meta_description"
                value={form.meta_description}
                onChange={(e) => set('meta_description', e.target.value)}
                className={INPUT}
                rows={2}
                maxLength={300}
              />
              <p className="mt-1 text-xs text-gray-400">{form.meta_description.length}/300</p>
            </div>

            <div>
              <label htmlFor="canonical_url" className={LABEL}>
                Canonical URL
              </label>
              <input
                id="canonical_url"
                type="text"
                value={form.canonical_url}
                onChange={(e) => set('canonical_url', e.target.value)}
                className={INPUT}
                placeholder="Leave blank to use this post's URL"
              />
            </div>

            <div>
              <span className={LABEL}>OG image</span>
              <ImageField
                value={form.og_image}
                onPick={() => setPicker('og')}
                onClear={() => set('og_image', '')}
                onChange={(v) => set('og_image', v)}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(form.noindex)}
                onChange={(e) => set('noindex', e.target.checked ? 1 : 0)}
                className="h-4 w-4 rounded"
              />
              Hide from search engines (noindex)
            </label>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
            <div>
              <label htmlFor="status" className={LABEL}>
                Status
              </label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => set('status', e.target.value as BlogFormValues['status'])}
                className={INPUT}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            {form.status === 'scheduled' && (
              <div>
                <label htmlFor="published_at" className={LABEL}>
                  Publish at
                </label>
                <input
                  id="published_at"
                  type="datetime-local"
                  value={form.published_at}
                  onChange={(e) => set('published_at', e.target.value)}
                  className={INPUT}
                  required
                />
                <p className="mt-1 text-xs text-gray-400">
                  The publish cron promotes scheduled posts once this time passes.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="category_id" className={LABEL}>
                Category
              </label>
              <select
                id="category_id"
                value={form.category_id ?? ''}
                onChange={(e) => set('category_id', e.target.value ? Number(e.target.value) : null)}
                className={INPUT}
              >
                <option value="">Uncategorised</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="author" className={LABEL}>
                Author
              </label>
              <input
                id="author"
                type="text"
                value={form.author}
                onChange={(e) => set('author', e.target.value)}
                className={INPUT}
                maxLength={100}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
            <span className={LABEL}>Featured image</span>
            <ImageField
              value={form.featured_image}
              onPick={() => setPicker('featured')}
              onClear={() => set('featured_image', '')}
              onChange={(v) => set('featured_image', v)}
            />
            <div>
              <label htmlFor="image_alt" className={LABEL}>
                Image alt text
              </label>
              <input
                id="image_alt"
                type="text"
                value={form.image_alt}
                onChange={(e) => set('image_alt', e.target.value)}
                className={INPUT}
                maxLength={200}
                placeholder="Describe the image for screen readers"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : mode === 'create' ? 'Create post' : 'Save changes'}
            </button>
            <Link
              href="/admin/blog"
              className="rounded-xl border border-gray-200 px-6 py-3 text-center text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </div>
      </form>

      {picker && (
        <MediaPicker
          onClose={() => setPicker(null)}
          onSelect={(item) => {
            if (picker === 'featured') {
              set('featured_image', item.path);
              if (!form.image_alt && item.alt) set('image_alt', item.alt);
            } else {
              set('og_image', item.path);
            }
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
