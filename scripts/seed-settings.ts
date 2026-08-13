import { getDb } from '../lib/db';

const db = getDb();

const defaultSettings = [
  { key: 'site_name', value: 'NextMove Services' },
  { key: 'logo_url', value: '/images/logo.svg' },
  { key: 'phone_numbers', value: JSON.stringify([
    { name: 'Maher', role: 'Consultant', phone: '+971529102088' },
    { name: 'Maryam', role: 'Registration', phone: '+971505363584' },
    { name: 'Ajin Alex', role: 'Logistics Partner', phone: '+971509707440' }
  ])},
  { key: 'whatsapp_contacts', value: JSON.stringify([
    { name: 'Maher', role: 'Consultant', phone: '+971529102088', photo_url: '/images/maher.jpg' },
    { name: 'Maryam', role: 'Registration', phone: '+971505363584', photo_url: '/images/maryam.jpg' },
    { name: 'Ajin Alex', role: 'Senior Advisor', phone: '+971509707440', photo_url: '/images/ajin.jpg' }
  ])},
  { key: 'email', value: 'registrations@nextmoveservices.ae' },
  { key: 'address', value: 'Iliya Tower 1, Office#207, PB#234823, Dubai-UAE' },
  { key: 'working_hours', value: 'Mon-Fri: 8:30am-5:30pm' },
  { key: 'social_links', value: JSON.stringify({
    linkedin: 'https://www.linkedin.com/company/nextmove-services',
    facebook: 'https://www.facebook.com/profile.php?id=61576244169690',
    instagram: 'https://www.instagram.com/nextmoveservices/'
  })},
  { key: 'footer_text', value: '© 2026 Next Move Services. All Rights Reserved' }
];

const insert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

for (const setting of defaultSettings) {
  insert.run(setting.key, setting.value);
}

console.log('Default settings seeded');
