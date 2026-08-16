import { z } from 'zod';

/**
 * Shared zod schemas.
 *
 * `PUT /api/admin/services/[id]` previously wrote raw `body.*` values straight
 * into SQL with no validation at all, while its sibling `POST` did validate.
 * Defining each entity's shape once removes that asymmetry and keeps the create
 * and update paths honest about the same column limits.
 */

/** A site-relative media path or an absolute http(s) URL. */
export const imageRef = z
  .string()
  .max(500)
  .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//i.test(v), {
    message: 'Must be a site-relative path or an absolute http(s) URL',
  });

export const slugField = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens only');

/** Accepts `true`/`false`, `1`/`0` — forms and JSON clients send both. */
export const boolFlag = z
  .union([z.boolean(), z.number().int().min(0).max(1), z.enum(['0', '1', 'true', 'false'])])
  .transform((v) => (v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0));

/* ------------------------------------------------------------------ *
 * Services
 * ------------------------------------------------------------------ */

export const serviceSchema = z.object({
  title: z.string().min(1).max(200),
  slug: slugField,
  tag: z.string().max(50).optional().default(''),
  summary: z.string().max(500).optional().default(''),
  body: z.any().optional().nullable(),
  icon: z.string().max(100).optional().default(''),
  hero_image: imageRef.optional().default(''),
  sort_order: z.coerce.number().int().min(0).max(9999).optional().default(0),
  is_active: boolFlag.optional().default(1),
  meta_title: z.string().max(200).optional().default(''),
  meta_description: z.string().max(300).optional().default(''),
  og_image: imageRef.optional().default(''),
});

export type ServiceInput = z.infer<typeof serviceSchema>;

/* ------------------------------------------------------------------ *
 * Team members
 * ------------------------------------------------------------------ */

export const teamMemberSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  bio: z.string().max(5000).optional().default(''),
  linkedin: z
    .string()
    .max(300)
    .refine((v) => v === '' || /^https?:\/\//i.test(v), { message: 'Must be an http(s) URL' })
    .optional()
    .default(''),
  photo_url: imageRef.optional().default(''),
  phone: z.string().max(20).optional().default(''),
  email: z.union([z.string().email().max(255), z.literal('')]).optional().default(''),
  whatsapp: z.string().max(20).optional().default(''),
  sort_order: z.coerce.number().int().min(0).max(9999).optional().default(0),
  is_active: boolFlag.optional().default(1),
});

export type TeamMemberInput = z.infer<typeof teamMemberSchema>;

/* ------------------------------------------------------------------ *
 * Categories
 * ------------------------------------------------------------------ */

export const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: slugField.max(100),
  description: z.string().max(2000).optional().default(''),
  sort_order: z.coerce.number().int().min(0).max(9999).optional().default(0),
});

/* ------------------------------------------------------------------ *
 * Menus
 * ------------------------------------------------------------------ */

export const MENU_LOCATIONS = ['header', 'footer_services', 'footer_company', 'footer_contact'] as const;

export const menuItemSchema = z.object({
  location: z.enum(MENU_LOCATIONS),
  label: z.string().min(1).max(100),
  url: z
    .string()
    .min(1)
    .max(300)
    .refine((v) => v.startsWith('/') || /^(https?:\/\/|mailto:|tel:)/i.test(v), {
      message: 'Must be a site-relative path, or an http(s)/mailto/tel URL',
    }),
  parent_id: z.coerce.number().int().positive().optional().nullable(),
  sort_order: z.coerce.number().int().min(0).max(9999).optional().default(0),
  is_active: boolFlag.optional().default(1),
  open_new_tab: boolFlag.optional().default(0),
});

/* ------------------------------------------------------------------ *
 * Submissions (admin edit)
 * ------------------------------------------------------------------ */

export const SUBMISSION_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'] as const;

/**
 * Every field optional, because this endpoint performs a **partial** update.
 *
 * The previous version wrote `notes = body.notes || null` unconditionally, so the
 * status dropdown — which sends only `{ status }` — silently erased whatever notes
 * had been written about that lead.
 */
export const submissionUpdateSchema = z
  .object({
    status: z.enum(SUBMISSION_STATUSES).optional(),
    notes: z.string().max(10_000).nullable().optional(),
  })
  .refine((v) => v.status !== undefined || v.notes !== undefined, {
    message: 'Provide at least one of: status, notes',
  });

/* ------------------------------------------------------------------ *
 * Admin users
 * ------------------------------------------------------------------ */

export const ROLES = ['admin', 'editor'] as const;

/** Long enough to matter; complexity rules are checked separately for clearer errors. */
export const passwordField = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(200)
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v), {
    message: 'Password must include lower case, upper case and a number',
  });

export const createUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100),
  role: z.enum(ROLES),
  password: passwordField,
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(ROLES).optional(),
  is_active: boolFlag.optional(),
  password: passwordField.optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordField,
});
