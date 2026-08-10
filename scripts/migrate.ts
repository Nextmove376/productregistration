/**
 * Schema migration. Idempotent — safe to re-run.
 *
 *   npm run db:migrate
 *
 * Requires DB_HOST / DB_USER / DB_PASSWORD / DB_NAME in the environment
 * (hPanel → Advanced → Environment variables, or a local .env).
 */
import pool from '../lib/db.ts';

const statements: Array<[string, string]> = [
  [
    'categories',
    `CREATE TABLE IF NOT EXISTS categories (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(120) NOT NULL UNIQUE,
      description VARCHAR(300) NULL,
      sort_order SMALLINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
  [
    'posts',
    `CREATE TABLE IF NOT EXISTS posts (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(200) NOT NULL UNIQUE,
      title VARCHAR(200) NOT NULL,
      excerpt VARCHAR(500) NULL,
      content LONGTEXT NOT NULL,
      featured_image VARCHAR(300) NULL,
      image_alt VARCHAR(200) NULL,
      category_id INT UNSIGNED NULL,
      author VARCHAR(100) NOT NULL DEFAULT 'Next Move Services',
      status ENUM('draft','scheduled','published') NOT NULL DEFAULT 'draft',
      published_at DATETIME NULL,
      meta_title VARCHAR(200) NULL,
      meta_description VARCHAR(320) NULL,
      og_image VARCHAR(300) NULL,
      canonical_url VARCHAR(300) NULL,
      noindex TINYINT(1) NOT NULL DEFAULT 0,
      reading_minutes SMALLINT NOT NULL DEFAULT 5,
      views INT UNSIGNED NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_posts_live (status, published_at),
      INDEX idx_posts_category (category_id),
      CONSTRAINT fk_posts_category FOREIGN KEY (category_id)
        REFERENCES categories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
  [
    'services',
    `CREATE TABLE IF NOT EXISTS services (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(150) NOT NULL UNIQUE,
      title VARCHAR(150) NOT NULL,
      tag VARCHAR(60) NULL,
      summary VARCHAR(500) NULL,
      body JSON NULL,
      icon VARCHAR(60) NULL,
      hero_image VARCHAR(300) NULL,
      timeline VARCHAR(60) NULL,
      meta_title VARCHAR(200) NULL,
      meta_description VARCHAR(320) NULL,
      sort_order SMALLINT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_services_live (is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
  [
    'pages',
    `CREATE TABLE IF NOT EXISTS pages (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      page_key VARCHAR(60) NOT NULL UNIQUE,
      title VARCHAR(200) NULL,
      blocks JSON NULL,
      meta_title VARCHAR(200) NULL,
      meta_description VARCHAR(320) NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
  [
    'team_members',
    `CREATE TABLE IF NOT EXISTS team_members (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(120) NOT NULL,
      bio TEXT NULL,
      photo_url VARCHAR(300) NULL,
      whatsapp VARCHAR(24) NULL,
      phone VARCHAR(24) NULL,
      email VARCHAR(200) NULL,
      linkedin VARCHAR(300) NULL,
      sort_order SMALLINT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_team_live (is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
  [
    'menus',
    `CREATE TABLE IF NOT EXISTS menus (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      location ENUM('header','footer_services','footer_company','footer_contact') NOT NULL,
      label VARCHAR(100) NOT NULL,
      url VARCHAR(300) NOT NULL,
      parent_id INT UNSIGNED NULL,
      sort_order SMALLINT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      open_new_tab TINYINT(1) NOT NULL DEFAULT 0,
      INDEX idx_menus_loc (location, is_active, sort_order),
      CONSTRAINT fk_menus_parent FOREIGN KEY (parent_id)
        REFERENCES menus(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
  [
    'settings',
    `CREATE TABLE IF NOT EXISTS settings (
      setting_key VARCHAR(80) NOT NULL PRIMARY KEY,
      value LONGTEXT NULL,
      type ENUM('text','json','image','bool') NOT NULL DEFAULT 'text',
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
  [
    'admin_users',
    `CREATE TABLE IF NOT EXISTS admin_users (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(200) NOT NULL UNIQUE,
      password_hash VARCHAR(100) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role ENUM('admin','editor') NOT NULL DEFAULT 'editor',
      last_login_at DATETIME NULL,
      failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
      locked_until DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
  [
    'submissions',
    `CREATE TABLE IF NOT EXISTS submissions (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(200) NOT NULL,
      phone VARCHAR(40) NULL,
      company VARCHAR(200) NULL,
      service VARCHAR(200) NULL,
      message TEXT NOT NULL,
      source_page VARCHAR(300) NULL,
      utm_source VARCHAR(120) NULL,
      utm_medium VARCHAR(120) NULL,
      utm_campaign VARCHAR(160) NULL,
      utm_term VARCHAR(160) NULL,
      utm_content VARCHAR(160) NULL,
      referrer VARCHAR(400) NULL,
      ip_hash CHAR(64) NULL,
      country CHAR(2) NULL,
      city VARCHAR(120) NULL,
      device VARCHAR(20) NULL,
      browser VARCHAR(40) NULL,
      status ENUM('new','contacted','qualified','won','lost') NOT NULL DEFAULT 'new',
      notes TEXT NULL,
      mail_status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
      mail_error VARCHAR(500) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sub_created (created_at),
      INDEX idx_sub_status (status, created_at),
      INDEX idx_sub_mail (mail_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
  [
    'pageviews',
    `CREATE TABLE IF NOT EXISTS pageviews (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      path VARCHAR(300) NOT NULL,
      referrer VARCHAR(400) NULL,
      referrer_host VARCHAR(160) NULL,
      utm_source VARCHAR(120) NULL,
      utm_medium VARCHAR(120) NULL,
      utm_campaign VARCHAR(160) NULL,
      country CHAR(2) NULL,
      city VARCHAR(120) NULL,
      device VARCHAR(20) NULL,
      browser VARCHAR(40) NULL,
      os VARCHAR(40) NULL,
      session_id CHAR(32) NULL,
      ip_hash CHAR(64) NULL,
      is_bot TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pv_created (created_at),
      INDEX idx_pv_path (path, created_at),
      INDEX idx_pv_country (country, created_at),
      INDEX idx_pv_session (session_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
  [
    'daily_stats',
    `CREATE TABLE IF NOT EXISTS daily_stats (
      stat_date DATE NOT NULL,
      path VARCHAR(300) NOT NULL,
      country CHAR(2) NOT NULL DEFAULT '--',
      views INT UNSIGNED NOT NULL DEFAULT 0,
      visitors INT UNSIGNED NOT NULL DEFAULT 0,
      PRIMARY KEY (stat_date, path, country),
      INDEX idx_ds_date (stat_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
  [
    'media',
    `CREATE TABLE IF NOT EXISTS media (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      path VARCHAR(400) NOT NULL UNIQUE,
      width SMALLINT UNSIGNED NULL,
      height SMALLINT UNSIGNED NULL,
      size_bytes INT UNSIGNED NULL,
      alt VARCHAR(300) NULL,
      uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_media_uploaded (uploaded_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
];

async function main() {
  console.log('Running migrations…\n');
  for (const [name, sql] of statements) {
    await pool.query(sql);
    console.log(`  ✓ ${name}`);
  }
  console.log('\nMigration complete.');
  await pool.end();
}

main().catch((err) => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
