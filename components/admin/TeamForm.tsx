'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, AlertCircle, ImagePlus, X, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/client-api';
import MediaPicker from '@/components/admin/MediaPicker';
import { CheckboxField, Field, TextField, TextareaField } from '@/components/admin/ui/fields';

export interface TeamFormValues {
  id?: number;
  name: string;
  role: string;
  bio: string;
  linkedin: string;
  photo_url: string;
  phone: string;
  email: string;
  whatsapp: string;
  sort_order: number;
  is_active: number;
}

const EMPTY: TeamFormValues = {
  name: '',
  role: '',
  bio: '',
  linkedin: '',
  photo_url: '',
  phone: '',
  email: '',
  whatsapp: '',
  sort_order: 0,
  is_active: 1,
};

export default function TeamForm({
  initial,
  mode,
}: {
  initial?: Partial<TeamFormValues>;
  mode: 'create' | 'edit';
}) {
  const router = useRouter();
  const [form, setForm] = useState<TeamFormValues>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState(false);

  const set = <K extends keyof TeamFormValues>(key: K, value: TeamFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});

    try {
      if (mode === 'create') {
        await api.post('/api/team', form);
      } else {
        await api.put(`/api/team/${initial?.id}`, form);
      }
      router.push('/admin/team');
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
          href="/admin/team"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
          aria-label="Back to team"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {mode === 'create' ? 'New Team Member' : 'Edit Team Member'}
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
              id="name"
              label="Name"
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              maxLength={100}
              error={fieldErrors.name}
              required
            />
            <TextField
              id="role"
              label="Role"
              type="text"
              value={form.role}
              onChange={(e) => set('role', e.target.value)}
              maxLength={100}
              error={fieldErrors.role}
              required
            />
          </div>

          <TextareaField
            id="bio"
            label="Bio"
            value={form.bio}
            onChange={(e) => set('bio', e.target.value)}
            rows={4}
            maxLength={5000}
            showCount
            error={fieldErrors.bio}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="phone"
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              maxLength={20}
              help="Shown as a Call button on the public team page."
              error={fieldErrors.phone}
            />
            <TextField
              id="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              maxLength={255}
              error={fieldErrors.email}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="whatsapp"
              label="WhatsApp"
              type="text"
              value={form.whatsapp}
              onChange={(e) => set('whatsapp', e.target.value)}
              maxLength={20}
              help="Digits only, including country code."
              error={fieldErrors.whatsapp}
            />
            <TextField
              id="linkedin"
              label="LinkedIn URL"
              type="url"
              value={form.linkedin}
              onChange={(e) => set('linkedin', e.target.value)}
              maxLength={300}
              error={fieldErrors.linkedin}
            />
          </div>

          <Field id="photo_url" label="Photo">
            <div>
              {form.photo_url ? (
                <div className="relative mb-2 h-32 w-32 overflow-hidden rounded-xl border border-gray-200">
                  <img src={form.photo_url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => set('photo_url', '')}
                    className="absolute right-1 top-1 rounded-lg bg-white/90 p-1 text-gray-700 hover:bg-white"
                    aria-label="Remove photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.photo_url}
                  onChange={(e) => set('photo_url', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-gray-400"
                  placeholder="/api/media/…"
                />
                <button
                  type="button"
                  onClick={() => setPicker(true)}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <ImagePlus className="h-3.5 w-3.5" /> Browse
                </button>
              </div>
            </div>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="sort_order"
              label="Sort order"
              type="number"
              min={0}
              value={form.sort_order}
              onChange={(e) => set('sort_order', Number.parseInt(e.target.value, 10) || 0)}
              error={fieldErrors.sort_order}
            />
            <div className="flex items-end">
              {/* `is_active` was in the new-member form's state but had no control. */}
              <CheckboxField
                id="is_active"
                label="Active"
                help="Inactive members are hidden from the public team page."
                checked={Boolean(form.is_active)}
                onChange={(checked) => set('is_active', checked ? 1 : 0)}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : mode === 'create' ? 'Create member' : 'Save changes'}
          </button>
          <Link
            href="/admin/team"
            className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>

      {picker && (
        <MediaPicker
          onClose={() => setPicker(false)}
          onSelect={(item) => {
            set('photo_url', item.path ?? '');
            setPicker(false);
          }}
        />
      )}
    </div>
  );
}
