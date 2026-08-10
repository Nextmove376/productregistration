/**
 * Seed default settings and menu items.
 *
 *   npm run db:seed
 *
 * Requires DB_HOST / DB_USER / DB_PASSWORD / DB_NAME in the environment.
 */
import pool from '../lib/db.ts';

const SETTINGS: Array<[string, string, string]> = [
  ['site_name', 'Next Move Services', 'text'],
  ['logo_header', '/images/logo.png', 'image'],
  ['logo_footer', '/images/logo.png', 'image'],
  ['email', 'hello@nextmoveservices.ae', 'text'],
  ['phone', '+971529102088', 'text'],
  ['address', 'Iliya Tower 1, Office# 207, PB#234823, Dubai — UAE', 'text'],
  ['working_hours', 'Saturday — Thursday: 8:30 AM — 5:30 PM', 'text'],
  ['footer_tagline', 'From idea to official — simple. UAE product registration and business setup.', 'text'],
  ['footer_legal', 'Registered in the United Arab Emirates', 'text'],
  ['social_links', '{}', 'json'],
  ['enquiry_recipients', '["hello@nextmoveservices.ae"]', 'json'],
  ['whatsapp_enabled', '1', 'bool'],
  ['whatsapp_greeting', 'Typically replies within minutes', 'text'],
  ['whatsapp_agents', '[{"name":"Next Move Services","role":"Support","phone":"971529102088","hours":"Sat-Thu 8:30-17:30"}]', 'json'],
  ['phone_enabled', '1', 'bool'],
  ['phone_greeting', 'Choose a contact to reach', 'text'],
  ['phone_agents', '[{"name":"Maher El Delbani","role":"Consultant","phone":"+971529102088"},{"name":"Mariam Shana","role":"Regulatory Affairs","phone":"+971505363584"},{"name":"Ajin Alex","role":"Senior Advisor","phone":"+971509707440"}]', 'json'],
  ['ga4_id', '', 'text'],
];

const MENUS: Array<[string, string, string, number | null, number, number]> = [
  ['header', 'Home', '/', null, 0, 0],
  ['header', 'Services', '/services', null, 1, 0],
  ['header', 'About', '/about', null, 2, 0],
  ['header', 'Team', '/team', null, 3, 0],
  ['header', 'Blog', '/blog', null, 4, 0],
  ['header', 'Contact', '/contact', null, 5, 0],
];

async function main() {
  console.log('Seeding settings…\n');

  for (const [key, value, type] of SETTINGS) {
    await pool.query(
      `INSERT INTO settings (setting_key, value, type, updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
      [key, value, type]
    );
    console.log(`  ✓ ${key}`);
  }

  console.log('\nSeeding menus…\n');

  for (const [location, label, url, parentId, sortOrder, isActive] of MENUS) {
    await pool.query(
      `INSERT INTO menus (location, label, url, parent_id, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label), url = VALUES(url)`,
      [location, label, url, parentId, sortOrder, isActive]
    );
    console.log(`  ✓ ${label}`);
  }

  console.log('\nSeed complete.');
  await pool.end();
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
