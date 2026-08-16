import type { Pool, PoolConnection } from 'mysql2/promise';
import pool from '../lib/db';

/**
 * Numbered, append-only migrations with a ledger.
 *
 * Why this was rewritten: the previous version used
 * `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, which is MariaDB-only syntax. On
 * MySQL 8 it fails with a syntax error (errno 1064), and the surrounding catch
 * only swallowed 1060 (duplicate column) — so the whole migration aborted and
 * those columns had to be added by hand in phpMyAdmin.
 *
 * Everything here is guarded by `information_schema` lookups instead, and each
 * step is recorded in `schema_migrations` so re-running is always safe.
 */

type Runner = Pool | PoolConnection;

interface Migration {
  name: string;
  up: (db: Runner) => Promise<void>;
}

/* ------------------------------------------------------------------ *
 * Schema introspection helpers (portable across MySQL 5.7/8 and MariaDB)
 * ------------------------------------------------------------------ */

async function columnExists(db: Runner, table: string, column: string): Promise<boolean> {
  const [rows] = await db.execute(
    `SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
      LIMIT 1`,
    [table, column]
  );
  return (rows as unknown[]).length > 0;
}

async function tableExists(db: Runner, table: string): Promise<boolean> {
  const [rows] = await db.execute(
    `SELECT 1 FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      LIMIT 1`,
    [table]
  );
  return (rows as unknown[]).length > 0;
}

async function indexExists(db: Runner, table: string, indexName: string): Promise<boolean> {
  const [rows] = await db.execute(
    `SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
      LIMIT 1`,
    [table, indexName]
  );
  return (rows as unknown[]).length > 0;
}

async function addColumn(db: Runner, table: string, column: string, definition: string): Promise<void> {
  if (!(await tableExists(db, table))) {
    console.log(`    - skip ${table}.${column} (table missing)`);
    return;
  }
  if (await columnExists(db, table, column)) return;
  // Identifiers cannot be parameterised; they are hard-coded literals here.
  await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  console.log(`    + ${table}.${column}`);
}

async function modifyColumn(db: Runner, table: string, column: string, definition: string): Promise<void> {
  if (!(await tableExists(db, table))) return;
  if (!(await columnExists(db, table, column))) return;
  await db.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${definition}`);
  console.log(`    ~ ${table}.${column} -> ${definition}`);
}

async function addIndex(db: Runner, table: string, indexName: string, columns: string): Promise<void> {
  if (!(await tableExists(db, table))) return;
  if (await indexExists(db, table, indexName)) return;
  await db.query(`ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (${columns})`);
  console.log(`    + index ${table}.${indexName}`);
}

/* ------------------------------------------------------------------ *
 * Migrations — append only, never edit an applied entry
 * ------------------------------------------------------------------ */

const BASE_TABLES = [
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

const SOFT_DELETE_TABLES = ['posts', 'services', 'team_members', 'media', 'submissions'] as const;

const MIGRATIONS: Migration[] = [
  {
    name: '001_base_tables',
    up: async (db) => {
      for (const sql of BASE_TABLES) await db.query(sql);
    },
  },

  {
    name: '002_media_extra_columns',
    up: async (db) => {
      // These are the three columns that previously had to be added manually.
      await addColumn(db, 'media', 'mime_type', 'VARCHAR(100) DEFAULT NULL');
      await addColumn(db, 'media', 'thumbnail_path', 'VARCHAR(500) DEFAULT NULL');
      await addColumn(db, 'media', 'blur_data', 'TEXT DEFAULT NULL');
    },
  },

  {
    name: '003_media_alt_widen',
    up: async (db) => {
      // The PATCH endpoint accepts 300 chars; the column was VARCHAR(200).
      await modifyColumn(db, 'media', 'alt', 'VARCHAR(300) DEFAULT NULL');
    },
  },

  {
    name: '004_admin_user_flags',
    up: async (db) => {
      await addColumn(db, 'admin_users', 'is_active', 'TINYINT NOT NULL DEFAULT 1');
      // Bumping this revokes every live JWT for the user.
      await addColumn(db, 'admin_users', 'session_version', 'INT NOT NULL DEFAULT 0');
    },
  },

  {
    name: '005_soft_delete',
    up: async (db) => {
      for (const table of SOFT_DELETE_TABLES) {
        await addColumn(db, table, 'deleted_at', 'DATETIME DEFAULT NULL');
        await addIndex(db, table, 'idx_deleted_at', '`deleted_at`');
      }
    },
  },

  {
    name: '006_audit_log',
    up: async (db) => {
      // `before`/`after` are reserved words in MySQL, hence the _json suffixes.
      await db.query(
        `CREATE TABLE IF NOT EXISTS audit_log (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_id INT DEFAULT NULL,
            user_email VARCHAR(255) DEFAULT NULL,
            action VARCHAR(64) NOT NULL,
            entity VARCHAR(64) NOT NULL,
            entity_id VARCHAR(64) DEFAULT NULL,
            before_json JSON DEFAULT NULL,
            after_json JSON DEFAULT NULL,
            meta_json JSON DEFAULT NULL,
            ip_hash VARCHAR(64) DEFAULT NULL,
            user_agent VARCHAR(500) DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_created (created_at),
            INDEX idx_entity (entity, entity_id),
            INDEX idx_user (user_id),
            INDEX idx_action (action)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      );
    },
  },

  {
    name: '007_query_indexes',
    up: async (db) => {
      // Match the shapes the app actually queries now that soft delete is in play.
      await addIndex(db, 'posts', 'idx_deleted_status_pub', '`deleted_at`, `status`, `published_at`');
      await addIndex(db, 'submissions', 'idx_deleted_status_created', '`deleted_at`, `status`, `created_at`');
      await addIndex(db, 'media', 'idx_deleted_uploaded', '`deleted_at`, `uploaded_at`');
      await addIndex(db, 'services', 'idx_deleted_active_sort', '`deleted_at`, `is_active`, `sort_order`');
      await addIndex(db, 'team_members', 'idx_deleted_active_sort', '`deleted_at`, `is_active`, `sort_order`');
      await addIndex(db, 'pageviews', 'idx_bot_created', '`is_bot`, `created_at`');
    },
  },

  {
    name: '008_media_path_unique',
    up: async (db) => {
      // Speeds up the reference check performed before deleting a media file.
      await addIndex(db, 'media', 'idx_path', '`path`(191)');
    },
  },
];

/* ------------------------------------------------------------------ *
 * Runner
 * ------------------------------------------------------------------ */

async function ensureLedger(db: Runner): Promise<void> {
  await db.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(128) UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}

async function appliedMigrations(db: Runner): Promise<Set<string>> {
  const [rows] = await db.query('SELECT name FROM schema_migrations');
  return new Set((rows as { name: string }[]).map((r) => r.name));
}

async function migrate() {
  console.log('Running database migrations...\n');

  await ensureLedger(pool);
  const applied = await appliedMigrations(pool);

  let ran = 0;
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.name)) {
      console.log(`  = ${migration.name} (already applied)`);
      continue;
    }

    console.log(`  → ${migration.name}`);
    try {
      // DDL is not transactional in MySQL, so the ledger write is the commit
      // point: a failed step is simply not recorded and will retry next run.
      await migration.up(pool);
      await pool.execute('INSERT INTO schema_migrations (name) VALUES (?)', [migration.name]);
      ran++;
      console.log(`  ✓ ${migration.name}\n`);
    } catch (err) {
      console.error(`  ✗ ${migration.name} failed:`, err);
      throw err;
    }
  }

  console.log(
    ran === 0
      ? '\nSchema already up to date.'
      : `\nApplied ${ran} migration${ran === 1 ? '' : 's'} successfully.`
  );
  await pool.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('\nMigration failed:', err);
  process.exit(1);
});
