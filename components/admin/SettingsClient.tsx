'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Save, CheckCircle2, AlertCircle, Plus, Trash2, ImagePlus, X, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/client-api';
import MediaPicker from '@/components/admin/MediaPicker';
import type { SettingDef, SettingGroup } from '@/lib/settings';

const LABEL = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500';
const CONTROL =
  'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10';

export default function SettingsClient({
  defs,
  groups,
  initialValues,
}: {
  defs: SettingDef[];
  groups: { id: SettingGroup; label: string }[];
  initialValues: Record<string, string>;
}) {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [activeGroup, setActiveGroup] = useState<SettingGroup>(groups[0]?.id ?? 'general');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const set = useCallback((key: string, value: string) => {
    setDirty(true);
    setSaved(false);
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  /** Guard against navigating away with unsaved changes. */
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const visible = useMemo(() => defs.filter((d) => d.group === activeGroup), [defs, activeGroup]);

  /**
   * Reports the real outcome.
   *
   * The old handler awaited the fetch and then unconditionally showed "Saved!",
   * so a rejected or failed request still looked like a success.
   */
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setFieldErrors({});

    // Send only registry keys; the API rejects anything else.
    const payload: Record<string, string> = {};
    for (const def of defs) {
      payload[def.key] = values[def.key] ?? '';
    }

    try {
      await api.put('/api/settings', payload);
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 3000);
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
        setError('Could not save settings. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Changes take effect on the public site immediately after saving.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save
              </>
            )}
          </button>
        </div>
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

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200">
        {groups.map((g) => {
          const groupHasError = defs.some((d) => d.group === g.id && fieldErrors[d.key]);
          return (
            <button
              key={g.id}
              onClick={() => setActiveGroup(g.id)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${
                activeGroup === g.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {g.label}
              {groupHasError && <span className="ml-1.5 text-red-500">•</span>}
            </button>
          );
        })}
      </div>

      <div className="max-w-2xl space-y-6">
        {visible.map((def) => (
          <div key={def.key} className="rounded-2xl border border-gray-200 bg-white p-6">
            <SettingControl
              def={def}
              value={values[def.key] ?? ''}
              error={fieldErrors[def.key]}
              onChange={(v) => set(def.key, v)}
              onPickImage={() => setPicker(def.key)}
            />
          </div>
        ))}
      </div>

      {picker && (
        <MediaPicker
          onClose={() => setPicker(null)}
          onSelect={(item) => {
            set(picker, item.path ?? '');
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

function SettingControl({
  def,
  value,
  error,
  onChange,
  onPickImage,
}: {
  def: SettingDef;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onPickImage: () => void;
}) {
  const id = `setting-${def.key}`;

  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {def.label}
      </label>

      {def.type === 'image' ? (
        <ImageSetting id={id} value={value} onChange={onChange} onPick={onPickImage} />
      ) : def.type === 'json' && def.jsonShape === 'string[]' ? (
        <ListEditor id={id} value={value} onChange={onChange} />
      ) : def.type === 'json' && def.jsonShape === 'record' ? (
        <RecordEditor id={id} value={value} onChange={onChange} />
      ) : def.type === 'textarea' ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          maxLength={def.maxLength}
          className={`${CONTROL} ${error ? 'border-red-300' : ''}`}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={def.maxLength}
          className={`${CONTROL} ${error ? 'border-red-300' : ''}`}
        />
      )}

      {def.help && !error && <p className="mt-2 text-xs text-gray-400">{def.help}</p>}
      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ImageSetting({
  id,
  value,
  onChange,
  onPick,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onPick: () => void;
}) {
  return (
    <div>
      {value ? (
        <div className="relative mb-2 inline-block overflow-hidden rounded-xl border border-gray-200">
          <img src={value} alt="" className="h-24 w-auto max-w-full object-contain" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-1 top-1 rounded-lg bg-white/90 p-1 text-gray-700 hover:bg-white"
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={CONTROL}
          placeholder="/api/media/…"
        />
        <button
          type="button"
          onClick={onPick}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <ImagePlus className="h-3.5 w-3.5" /> Browse
        </button>
      </div>
    </div>
  );
}

/** Repeater for a JSON string array — e.g. `phone_numbers`, `whatsapp_contacts`. */
function ListEditor({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const items = useMemo<string[]>(() => {
    if (!value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      // Tolerate a legacy comma-separated value so nothing is silently lost.
      return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }, [value]);

  const commit = (next: string[]) => onChange(JSON.stringify(next.filter((s) => s.trim() !== '')));

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            id={i === 0 ? id : undefined}
            type="text"
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(JSON.stringify(next));
            }}
            className={CONTROL}
          />
          <button
            type="button"
            onClick={() => commit(items.filter((_, idx) => idx !== i))}
            className="shrink-0 rounded-xl border border-gray-200 px-3 text-gray-400 hover:bg-red-50 hover:text-red-600"
            aria-label={`Remove item ${i + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange(JSON.stringify([...items, '']))}
        className="flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        <Plus className="h-3.5 w-3.5" /> Add
      </button>
    </div>
  );
}

/** Key/value repeater for a JSON object — e.g. `social_links`. */
function RecordEditor({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const entries = useMemo<[string, string][]>(() => {
    if (!value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v)]);
      }
      return [];
    } catch {
      return [];
    }
  }, [value]);

  const commit = (next: [string, string][]) => {
    const obj: Record<string, string> = {};
    for (const [k, v] of next) {
      if (k.trim()) obj[k.trim()] = v;
    }
    onChange(JSON.stringify(obj));
  };

  return (
    <div className="space-y-2">
      {entries.map(([k, v], i) => (
        <div key={i} className="flex gap-2">
          <input
            id={i === 0 ? id : undefined}
            type="text"
            value={k}
            onChange={(e) => {
              const next: [string, string][] = [...entries];
              next[i] = [e.target.value, v];
              commit(next);
            }}
            placeholder="platform"
            className="w-1/3 rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-gray-400"
          />
          <input
            type="text"
            value={v}
            onChange={(e) => {
              const next: [string, string][] = [...entries];
              next[i] = [k, e.target.value];
              commit(next);
            }}
            placeholder="https://…"
            className={CONTROL}
          />
          <button
            type="button"
            onClick={() => commit(entries.filter((_, idx) => idx !== i))}
            className="shrink-0 rounded-xl border border-gray-200 px-3 text-gray-400 hover:bg-red-50 hover:text-red-600"
            aria-label={`Remove ${k || 'entry'}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => commit([...entries, ['', '']])}
        className="flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        <Plus className="h-3.5 w-3.5" /> Add link
      </button>
    </div>
  );
}
