import pool from '../lib/db';

async function migrate() {
  console.log('Running database migrations...');

  const tables = [
    `CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role ENUM('admin','editor') NOT NULL DEFAULT 'editor',
      last_login_at DATETIME,
      failed_attempts INT DEFAULT 0,
      locked_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(200) UNIQUE NOT NULL,
      title VARCHAR(300) NOT NULL,
      excerpt VARCHAR(500),
      content LONGTEXT,
      featured_image VARCHAR(500),
      image_alt VARCHAR(200),
      category_id INT,
      author VARCHAR(100),
      status ENUM('draft','scheduled','published') NOT NULL DEFAULT 'draft',
      published_at DATETIME,
      meta_title VARCHAR(200),
      meta_description VARCHAR(300),
      og_image VARCHAR(500),
      canonical_url VARCHAR(500),
      noindex TINYINT DEFAULT 0,
      reading_minutes INT DEFAULT 0,
      views INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status_published (status, published_at),
      INDEX idx_slug (slug),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS services (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(200) UNIQUE NOT NULL,
      title VARCHAR(200) NOT NULL,
      tag VARCHAR(50),
      summary VARCHAR(500),
      body JSON,
      icon VARCHAR(100),
      hero_image VARCHAR(500),
      sort_order INT DEFAULT 0,
      is_active TINYINT DEFAULT 1,
      meta_title VARCHAR(200),
      meta_description VARCHAR(300),
      og_image VARCHAR(500),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_slug (slug),
      INDEX idx_active_sort (is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS team_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(100) NOT NULL,
      bio TEXT,
      linkedin VARCHAR(300),
      photo_url VARCHAR(500),
      phone VARCHAR(20),
      email VARCHAR(255),
      whatsapp VARCHAR(20),
      sort_order INT DEFAULT 0,
      is_active TINYINT DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_active_sort (is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS menus (
      id INT AUTO_INCREMENT PRIMARY KEY,
      location ENUM('header','footer_services','footer_company','footer_contact') NOT NULL,
      label VARCHAR(100) NOT NULL,
      url VARCHAR(300) NOT NULL,
      parent_id INT,
      sort_order INT DEFAULT 0,
      is_active TINYINT DEFAULT 1,
      open_new_tab TINYINT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_location_sort (location, sort_order),
      FOREIGN KEY (parent_id) REFERENCES menus(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      \`key\` VARCHAR(100) UNIQUE NOT NULL,
      value LONGTEXT,
      type ENUM('text','json','image','bool') NOT NULL DEFAULT 'text',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      company VARCHAR(200),
      service VARCHAR(200),
      message TEXT,
      source_page VARCHAR(500),
      utm_source VARCHAR(200),
      utm_medium VARCHAR(200),
      utm_campaign VARCHAR(200),
      utm_term VARCHAR(200),
      utm_content VARCHAR(200),
      referrer VARCHAR(500),
      ip_hash VARCHAR(64),
      country VARCHAR(100),
      city VARCHAR(100),
      device VARCHAR(50),
      browser VARCHAR(50),
      status ENUM('new','contacted','qualified','won','lost') NOT NULL DEFAULT 'new',
      notes TEXT,
      mail_status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
      mail_error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS pageviews (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      path VARCHAR(500) NOT NULL,
      referrer VARCHAR(500),
      referrer_host VARCHAR(200),
      utm_source VARCHAR(200),
      utm_medium VARCHAR(200),
      utm_campaign VARCHAR(200),
      utm_term VARCHAR(200),
      utm_content VARCHAR(200),
      country VARCHAR(100),
      city VARCHAR(100),
      device VARCHAR(50),
      browser VARCHAR(50),
      os VARCHAR(50),
      session_id VARCHAR(64),
      ip_hash VARCHAR(64),
      is_bot TINYINT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_created (created_at),
      INDEX idx_path (path(191)),
      INDEX idx_country (country)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS daily_stats (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date DATE NOT NULL,
      path VARCHAR(500),
      country VARCHAR(100),
      views INT DEFAULT 0,
      visitors INT DEFAULT 0,
      UNIQUE INDEX idx_date_path_country (date, path(191), country)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS media (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      path VARCHAR(500) NOT NULL,
      width INT,
      height INT,
      size_bytes BIGINT,
      alt VARCHAR(200),
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_uploaded (uploaded_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];

  for (const sql of tables) {
    await pool.execute(sql);
  }

  console.log('All tables created successfully.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
