import { cache } from 'react';
import { query } from './db';

export type WidgetAgent = {
  name: string;
  role: string;
  phone: string;
  photo_url?: string;
  hours?: string;
};

export type SiteSettings = {
  site_name: string;
  logo_header: string;
  logo_footer: string;
  email: string;
  phone: string;
  address: string;
  working_hours: string;
  footer_tagline: string;
  footer_legal: string;
  social_links: Record<string, string>;
  enquiry_recipients: string[];
  whatsapp_enabled: boolean;
  whatsapp_greeting: string;
  whatsapp_agents: WidgetAgent[];
  phone_enabled: boolean;
  phone_greeting: string;
  phone_agents: WidgetAgent[];
  ga4_id: string;
};

const DEFAULTS: SiteSettings = {
  site_name: 'Next Move Services',
  logo_header: '/images/logo.png',
  logo_footer: '/images/logo.png',
  email: 'registrations@nextmoveservices.ae',
  phone: '+971529102088',
  address: 'Iliya Tower 1, Office# 207, PB#234823, Dubai — UAE',
  working_hours: 'Saturday — Thursday: 8:30 AM — 5:30 PM',
  footer_tagline: 'From idea to official — simple. UAE product registration and business setup.',
  footer_legal: 'Registered in the United Arab Emirates',
  social_links: {},
  enquiry_recipients: [],
  whatsapp_enabled: true,
  whatsapp_greeting: 'Typically replies within minutes',
  whatsapp_agents: [],
  phone_enabled: true,
  phone_greeting: 'Choose a contact to reach',
  phone_agents: [],
  ga4_id: '',
};

const JSON_KEYS = new Set([
  'social_links',
  'enquiry_recipients',
  'whatsapp_agents',
  'phone_agents',
]);
const BOOL_KEYS = new Set(['whatsapp_enabled', 'phone_enabled']);

/**
 * Load all settings for one render pass.
 *
 * `cache()` dedupes this within a single request, so a page that renders the
 * header, footer and both widgets still issues exactly one query.
 */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const rows = await query<{ setting_key: string; value: string | null }>(
      'SELECT setting_key, value FROM settings'
    );

    const out: Record<string, unknown> = { ...DEFAULTS };
    for (const { setting_key, value } of rows) {
      if (value === null) continue;
      if (JSON_KEYS.has(setting_key)) {
        try {
          out[setting_key] = JSON.parse(value);
        } catch {
          // Leave the default in place rather than crashing the whole site
          // because one settings row holds malformed JSON.
        }
      } else if (BOOL_KEYS.has(setting_key)) {
        out[setting_key] = value === '1' || value === 'true';
      } else {
        out[setting_key] = value;
      }
    }
    return out as SiteSettings;
  } catch {
    // The public site must still render if the database is unreachable.
    return DEFAULTS;
  }
});

export type MenuItem = {
  id: number;
  label: string;
  url: string;
  open_new_tab: boolean;
  children: MenuItem[];
};

type MenuRow = {
  id: number;
  label: string;
  url: string;
  parent_id: number | null;
  open_new_tab: number;
};

/** Build the nested menu tree for one location. */
export const getMenu = cache(async (location: string): Promise<MenuItem[]> => {
  try {
    const rows = await query<MenuRow>(
      `SELECT id, label, url, parent_id, open_new_tab
       FROM menus WHERE location = ? AND is_active = 1
       ORDER BY sort_order, id`,
      [location]
    );

    const byId = new Map<number, MenuItem>();
    for (const r of rows) {
      byId.set(r.id, {
        id: r.id,
        label: r.label,
        url: r.url,
        open_new_tab: !!r.open_new_tab,
        children: [],
      });
    }

    const roots: MenuItem[] = [];
    for (const r of rows) {
      const node = byId.get(r.id)!;
      const parent = r.parent_id ? byId.get(r.parent_id) : null;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return roots;
  } catch {
    return [];
  }
});

export const FALLBACK_HEADER_MENU: MenuItem[] = [
  { id: -1, label: 'Home', url: '/', open_new_tab: false, children: [] },
  { id: -2, label: 'Services', url: '/services', open_new_tab: false, children: [] },
  { id: -3, label: 'About', url: '/about', open_new_tab: false, children: [] },
  { id: -4, label: 'Team', url: '/team', open_new_tab: false, children: [] },
  { id: -5, label: 'Blog', url: '/blog', open_new_tab: false, children: [] },
  { id: -6, label: 'Contact', url: '/contact', open_new_tab: false, children: [] },
];
