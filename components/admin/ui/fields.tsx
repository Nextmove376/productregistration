'use client';

import type { ReactNode } from 'react';

/**
 * Shared form primitives for the admin panel.
 *
 * The existing forms repeated the same long Tailwind class strings on every input,
 * and several had `<label>` elements not associated with any control — so clicking
 * a label did nothing and screen readers announced the field unlabelled.
 */

export const LABEL_CLASS = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500';
export const CONTROL_CLASS =
  'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 disabled:bg-gray-50 disabled:text-gray-400';

interface FieldProps {
  id: string;
  label: string;
  help?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ id, label, help, error, required, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {help && !error && <p className="mt-1 text-xs text-gray-400">{help}</p>}
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  help?: string;
  error?: string;
};

export function TextField({ label, help, error, className, ...props }: InputProps) {
  return (
    <Field id={props.id} label={label} help={help} error={error} required={props.required}>
      <input
        {...props}
        aria-invalid={error ? true : undefined}
        className={`${CONTROL_CLASS} ${error ? 'border-red-300' : ''} ${className ?? ''}`}
      />
    </Field>
  );
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  label: string;
  help?: string;
  error?: string;
  /** Shows a live `used/max` counter under the field. */
  showCount?: boolean;
};

export function TextareaField({
  label,
  help,
  error,
  showCount,
  className,
  value,
  maxLength,
  ...props
}: TextareaProps) {
  const length = typeof value === 'string' ? value.length : 0;
  return (
    <Field id={props.id} label={label} help={help} error={error} required={props.required}>
      <textarea
        {...props}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        className={`${CONTROL_CLASS} ${error ? 'border-red-300' : ''} ${className ?? ''}`}
      />
      {showCount && maxLength ? (
        <p className="mt-1 text-right text-xs text-gray-400">
          {length}/{maxLength}
        </p>
      ) : null}
    </Field>
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  help?: string;
  error?: string;
  options: { value: string | number; label: string }[];
};

export function SelectField({ label, help, error, options, className, ...props }: SelectProps) {
  return (
    <Field id={props.id} label={label} help={help} error={error} required={props.required}>
      <select
        {...props}
        aria-invalid={error ? true : undefined}
        className={`${CONTROL_CLASS} ${error ? 'border-red-300' : ''} ${className ?? ''}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function CheckboxField({
  id,
  label,
  help,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  help?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        {label}
      </label>
      {help && <p className="mt-1 pl-6 text-xs text-gray-400">{help}</p>}
    </div>
  );
}

export function FormActions({
  saving,
  cancelHref,
  submitLabel,
  savingLabel = 'Saving…',
}: {
  saving: boolean;
  cancelHref: string;
  submitLabel: string;
  savingLabel?: string;
}) {
  return (
    <div className="flex gap-3">
      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
      >
        {saving ? savingLabel : submitLabel}
      </button>
      <a
        href={cancelHref}
        className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        Cancel
      </a>
    </div>
  );
}
