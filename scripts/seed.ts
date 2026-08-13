import pool from '../lib/db';
import { hashPassword } from '../lib/auth';

async function seed() {
  console.log('Seeding database...');

  // Default settings
  const settings = [
    { key: 'site_name', value: 'NextMove Services', type: 'text' },
    { key: 'logo_url', value: '/images/logo.png', type: 'image' },
    { key: 'email', value: 'registrations@nextmoveservices.ae', type: 'text' },
    { key: 'address', value: 'Iliya Tower 1, Office#207, PB#234823, Dubai-UAE', type: 'text' },
    { key: 'working_hours', value: 'Mon-Fri: 8:30am-5:30pm', type: 'text' },
    { key: 'phone_numbers', value: JSON.stringify([
      { name: 'Maher', role: 'Consultant', phone: '+971529102088' },
      { name: 'Mariam', role: 'Registration', phone: '+971505363584' },
      { name: 'Ajin Alex', role: 'Logistics Partner', phone: '+971509707440' }
    ]), type: 'json' },
    { key: 'whatsapp_contacts', value: JSON.stringify([
      { name: 'Maher', role: 'Consultant', phone: '+971529102088' },
      { name: 'Mariam', role: 'Registration', phone: '+971505363584' },
      { name: 'Ajin Alex', role: 'Senior Advisor', phone: '+971509707440' }
    ]), type: 'json' },
    { key: 'social_links', value: JSON.stringify({
      linkedin: 'https://www.linkedin.com/company/nextmove-services',
      facebook: 'https://www.facebook.com/profile.php?id=61576244169690',
      instagram: 'https://www.instagram.com/nextmoveservices/'
    }), type: 'json' },
    { key: 'footer_text', value: '© 2026 Next Move Services. All Rights Reserved', type: 'text' },
    { key: 'meta_title', value: 'Product Registration in UAE | MOHAP & Dubai Municipality', type: 'text' },
    { key: 'meta_description', value: 'End-to-end product registration in Dubai and UAE business setup: MOHAP approvals, Dubai Municipality & ESMA registration, freezone formation and PRO services.', type: 'text' },
  ];

  const insertSetting = await pool.prepare(
    'INSERT INTO settings (`key`, value, type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), type = VALUES(type)'
  );
  for (const s of settings) {
    await insertSetting.execute([s.key, s.value, s.type]);
  }
  await insertSetting.close();

  // Default services
  const services = [
    { slug: 'product-registration', title: 'Product Registration', tag: 'Core', summary: 'Cosmetics, food, supplements and household goods through Dubai Municipality, ESMA and MOIAT.', sort_order: 1 },
    { slug: 'mohap-registration', title: 'MOHAP / EDE Registration', tag: 'Healthcare', summary: 'Medical devices, pharmaceuticals and health products through the Ministry of Health.', sort_order: 2 },
    { slug: 'regulatory-approvals', title: 'Regulatory Approvals', tag: 'Compliance', summary: 'ESMA, Dubai Municipality and federal regulatory approvals for your products.', sort_order: 3 },
    { slug: 'business-setup', title: 'Business Setup', tag: 'Formation', summary: 'Freezone and mainland company formation, trade licenses and PRO services.', sort_order: 4 },
    { slug: 'mofa-attestation', title: 'MOFA Attestation', tag: 'Legal', summary: 'Ministry of Foreign Affairs document attestation and legalization.', sort_order: 5 },
    { slug: 'medical-drugstore', title: 'Medical & Drugstore', tag: 'Healthcare', summary: 'Pharmacy setup, drug store licensing and medical equipment registration.', sort_order: 6 },
  ];

  const insertService = await pool.prepare(
    'INSERT INTO services (slug, title, tag, summary, sort_order, is_active) VALUES (?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE title = VALUES(title), summary = VALUES(summary)'
  );
  for (const s of services) {
    await insertService.execute([s.slug, s.title, s.tag, s.summary, s.sort_order]);
  }
  await insertService.close();

  // Default menus
  const menus = [
    { location: 'header', label: 'Home', url: '/', sort_order: 1 },
    { location: 'header', label: 'Services', url: '/services', sort_order: 2 },
    { location: 'header', label: 'About', url: '/about', sort_order: 3 },
    { location: 'header', label: 'Team', url: '/team', sort_order: 4 },
    { location: 'header', label: 'Blog', url: '/blog', sort_order: 5 },
    { location: 'header', label: 'Contact', url: '/contact', sort_order: 6 },
    { location: 'footer_services', label: 'Product Registration', url: '/services/product-registration', sort_order: 1 },
    { location: 'footer_services', label: 'MOHAP / EDE', url: '/services/mohap-registration', sort_order: 2 },
    { location: 'footer_services', label: 'Business Setup', url: '/services/business-setup', sort_order: 3 },
    { location: 'footer_services', label: 'MOFA Attestation', url: '/services/mofa-attestation', sort_order: 4 },
    { location: 'footer_company', label: 'About', url: '/about', sort_order: 1 },
    { location: 'footer_company', label: 'Team', url: '/team', sort_order: 2 },
    { location: 'footer_company', label: 'Blog', url: '/blog', sort_order: 3 },
    { location: 'footer_company', label: 'Contact', url: '/contact', sort_order: 4 },
  ];

  const insertMenu = await pool.prepare(
    'INSERT INTO menus (location, label, url, sort_order, is_active) VALUES (?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE label = VALUES(label)'
  );
  for (const m of menus) {
    await insertMenu.execute([m.location, m.label, m.url, m.sort_order]);
  }
  await insertMenu.close();

  console.log('Database seeded successfully.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
