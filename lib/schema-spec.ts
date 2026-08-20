/**
 * The single source of truth for the database shape.
 *
 * WHY THIS FILE EXISTS
 *
 * `scripts/migrate.ts` created tables with `CREATE TABLE IF NOT EXISTS`. That is
 * safe, but it has one very sharp edge: when a table **already exists** MySQL does
 * nothing at all — it does not add the columns the newer definition contains. The
 * live Hostinger database was created by an earlier version of this project (it
 * still carries a `pages` table this codebase never defines), so every table was
 * "already there" and every column added since then was silently skipped.
 *
 * That is the single root cause of "Could not load services", "Could not load the
 * team", "Could not load analytics" and "Could not save settings": the queries name
 * columns such as `services.og_image`, `team_members.whatsapp`, `pageviews.os` and
 * `settings.type` which simply do not exist on the live database, so MySQL answers
 * with errno 1054 (`ER_BAD_FIELD_ERROR`) and the route's catch block turns that into
 * a generic toast.
 *
 * So the shape is declared once, here, column by column — and `lib/schema-repair.ts`
 * reconciles a live database against it. `scripts/migrate.ts` uses the same spec, so
 * the two can never drift again.
 */

/** Full table definitions, used only when a table is missing entirely. */
export const BASE_TABLES: string[] = [
  `CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role ENUM('admin','editor') NOT NULL DEFAULT 'editor',
      last_login_at DATETIME,
      failed_attempts INT DEFAULT 0,
      locked_until DATETIME,
      is_active TINYINT NOT NULL DEFAULT 1,
      session_version INT NOT NULL DEFAULT 0,
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
      deleted_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status_published (status, published_at),
      INDEX idx_slug (slug)
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
      deleted_at DATETIME DEFAULT NULL,
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
      deleted_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_active_sort (is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS menus (
      id INT AUTO_INCREMENT PRIMARY KEY,
      location ENUM('header','footer_services','footer_company','footer_contact') NOT NULL DEFAULT 'header',
      label VARCHAR(100) NOT NULL,
      url VARCHAR(300) NOT NULL,
      parent_id INT,
      sort_order INT DEFAULT 0,
      is_active TINYINT DEFAULT 1,
      open_new_tab TINYINT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_location_sort (location, sort_order)
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
      deleted_at DATETIME DEFAULT NULL,
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
      alt VARCHAR(300),
      mime_type VARCHAR(100),
      thumbnail_path VARCHAR(500),
      blur_data TEXT,
      deleted_at DATETIME DEFAULT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_uploaded (uploaded_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS audit_log (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT NULL,
      user_email VARCHAR(255) DEFAULT NULL,
      action VARCHAR(64) NOT NULL,
      entity VARCHAR(64) NOT NULL DEFAULT '',
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(128) UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  /*
   * Snapshot history for posts, written immediately before every update.
   *
   * Listed here, and not only in `scripts/migrate.ts`, so the "Repair database"
   * button creates it. The alternative was pasting DDL into phpMyAdmin, which is
   * how this table came to be missing in production in the first place — and the
   * paste failed on an unrelated `information_schema` permission error, so it
   * looked like the whole migration had failed when it had not.
   *
   * Column widths mirror `posts` exactly on purpose: a narrower column here would
   * truncate silently under a non-strict sql_mode, so the "backup" would quietly
   * differ from what it claims to preserve.
   *
   * `status` is VARCHAR(20) rather than the ENUM `posts` uses, because
   * `INSERT ... SELECT` into a narrower ENUM would start failing the moment `posts`
   * gains a fourth status — turning a routine save into a 500.
   *
   * Every snapshot column is nullable: a half-finished draft still deserves a
   * revision, and NOT NULL here would reject it.
   *
   * There is deliberately no foreign key to `posts`. Posts are soft-deleted, so
   * revisions must outlive a trashed post, and a hard purge must not silently take
   * the history with it.
   */
  `CREATE TABLE IF NOT EXISTS post_revisions (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      revision_number INT NOT NULL,
      title VARCHAR(300) DEFAULT NULL,
      slug VARCHAR(200) DEFAULT NULL,
      excerpt VARCHAR(500) DEFAULT NULL,
      content LONGTEXT,
      featured_image VARCHAR(500) DEFAULT NULL,
      image_alt VARCHAR(200) DEFAULT NULL,
      meta_title VARCHAR(200) DEFAULT NULL,
      meta_description VARCHAR(300) DEFAULT NULL,
      og_image VARCHAR(500) DEFAULT NULL,
      canonical_url VARCHAR(500) DEFAULT NULL,
      status VARCHAR(20) DEFAULT NULL,
      noindex TINYINT DEFAULT 0,
      category_id INT DEFAULT NULL,
      author VARCHAR(100) DEFAULT NULL,
      published_at DATETIME DEFAULT NULL,
      edited_by_id INT DEFAULT NULL,
      edited_by_email VARCHAR(255) DEFAULT NULL,
      note VARCHAR(255) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_post_revision (post_id, revision_number),
      INDEX idx_post_created (post_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

/**
 * Every column the application reads or writes, with an `ADD COLUMN`-compatible
 * definition. Definitions deliberately avoid `UNIQUE` and `FOREIGN KEY` — those are
 * declared in {@link INDEX_SPEC} so they can fail independently on a table that
 * already holds duplicate or orphaned rows without blocking the column repair.
 *
 * `NOT NULL` columns always carry a `DEFAULT`, so adding one to a table with
 * existing rows can never fail.
 */
export const COLUMN_SPEC: Record<string, Record<string, string>> = {
  admin_users: {
    email: 'VARCHAR(255) NOT NULL DEFAULT ""',
    password_hash: 'VARCHAR(255) NOT NULL DEFAULT ""',
    name: 'VARCHAR(100) NOT NULL DEFAULT ""',
    role: "ENUM('admin','editor') NOT NULL DEFAULT 'editor'",
    last_login_at: 'DATETIME DEFAULT NULL',
    failed_attempts: 'INT DEFAULT 0',
    locked_until: 'DATETIME DEFAULT NULL',
    is_active: 'TINYINT NOT NULL DEFAULT 1',
    session_version: 'INT NOT NULL DEFAULT 0',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
  categories: {
    name: 'VARCHAR(100) NOT NULL DEFAULT ""',
    slug: 'VARCHAR(100) NOT NULL DEFAULT ""',
    description: 'TEXT DEFAULT NULL',
    sort_order: 'INT DEFAULT 0',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  },
  posts: {
    slug: 'VARCHAR(200) NOT NULL DEFAULT ""',
    title: 'VARCHAR(300) NOT NULL DEFAULT ""',
    excerpt: 'VARCHAR(500) DEFAULT NULL',
    content: 'LONGTEXT DEFAULT NULL',
    featured_image: 'VARCHAR(500) DEFAULT NULL',
    image_alt: 'VARCHAR(200) DEFAULT NULL',
    category_id: 'INT DEFAULT NULL',
    author: 'VARCHAR(100) DEFAULT NULL',
    status: "ENUM('draft','scheduled','published') NOT NULL DEFAULT 'draft'",
    published_at: 'DATETIME DEFAULT NULL',
    meta_title: 'VARCHAR(200) DEFAULT NULL',
    meta_description: 'VARCHAR(300) DEFAULT NULL',
    og_image: 'VARCHAR(500) DEFAULT NULL',
    canonical_url: 'VARCHAR(500) DEFAULT NULL',
    noindex: 'TINYINT DEFAULT 0',
    reading_minutes: 'INT DEFAULT 0',
    views: 'INT DEFAULT 0',
    deleted_at: 'DATETIME DEFAULT NULL',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
  services: {
    slug: 'VARCHAR(200) NOT NULL DEFAULT ""',
    title: 'VARCHAR(200) NOT NULL DEFAULT ""',
    tag: 'VARCHAR(50) DEFAULT NULL',
    summary: 'VARCHAR(500) DEFAULT NULL',
    // Holds the admin-editable hero / breadcrumb / logo-ticker / "Our Services"
    // overrides merged in by components/services/ServicePageLayout.tsx.
    body: 'JSON DEFAULT NULL',
    icon: 'VARCHAR(100) DEFAULT NULL',
    hero_image: 'VARCHAR(500) DEFAULT NULL',
    sort_order: 'INT DEFAULT 0',
    is_active: 'TINYINT DEFAULT 1',
    meta_title: 'VARCHAR(200) DEFAULT NULL',
    meta_description: 'VARCHAR(300) DEFAULT NULL',
    og_image: 'VARCHAR(500) DEFAULT NULL',
    deleted_at: 'DATETIME DEFAULT NULL',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
  team_members: {
    name: 'VARCHAR(100) NOT NULL DEFAULT ""',
    role: 'VARCHAR(100) NOT NULL DEFAULT ""',
    bio: 'TEXT DEFAULT NULL',
    linkedin: 'VARCHAR(300) DEFAULT NULL',
    photo_url: 'VARCHAR(500) DEFAULT NULL',
    phone: 'VARCHAR(20) DEFAULT NULL',
    email: 'VARCHAR(255) DEFAULT NULL',
    whatsapp: 'VARCHAR(20) DEFAULT NULL',
    sort_order: 'INT DEFAULT 0',
    is_active: 'TINYINT DEFAULT 1',
    deleted_at: 'DATETIME DEFAULT NULL',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
  menus: {
    location: "ENUM('header','footer_services','footer_company','footer_contact') NOT NULL DEFAULT 'header'",
    label: 'VARCHAR(100) NOT NULL DEFAULT ""',
    url: 'VARCHAR(300) NOT NULL DEFAULT ""',
    parent_id: 'INT DEFAULT NULL',
    sort_order: 'INT DEFAULT 0',
    is_active: 'TINYINT DEFAULT 1',
    open_new_tab: 'TINYINT DEFAULT 0',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  },
  settings: {
    key: 'VARCHAR(100) NOT NULL DEFAULT ""',
    value: 'LONGTEXT DEFAULT NULL',
    type: "ENUM('text','json','image','bool') NOT NULL DEFAULT 'text'",
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
  submissions: {
    name: 'VARCHAR(100) NOT NULL DEFAULT ""',
    email: 'VARCHAR(255) NOT NULL DEFAULT ""',
    phone: 'VARCHAR(20) DEFAULT NULL',
    company: 'VARCHAR(200) DEFAULT NULL',
    service: 'VARCHAR(200) DEFAULT NULL',
    message: 'TEXT DEFAULT NULL',
    source_page: 'VARCHAR(500) DEFAULT NULL',
    utm_source: 'VARCHAR(200) DEFAULT NULL',
    utm_medium: 'VARCHAR(200) DEFAULT NULL',
    utm_campaign: 'VARCHAR(200) DEFAULT NULL',
    utm_term: 'VARCHAR(200) DEFAULT NULL',
    utm_content: 'VARCHAR(200) DEFAULT NULL',
    referrer: 'VARCHAR(500) DEFAULT NULL',
    ip_hash: 'VARCHAR(64) DEFAULT NULL',
    country: 'VARCHAR(100) DEFAULT NULL',
    city: 'VARCHAR(100) DEFAULT NULL',
    device: 'VARCHAR(50) DEFAULT NULL',
    browser: 'VARCHAR(50) DEFAULT NULL',
    status: "ENUM('new','contacted','qualified','won','lost') NOT NULL DEFAULT 'new'",
    notes: 'TEXT DEFAULT NULL',
    mail_status: "ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending'",
    mail_error: 'TEXT DEFAULT NULL',
    deleted_at: 'DATETIME DEFAULT NULL',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  },
  pageviews: {
    path: 'VARCHAR(500) NOT NULL DEFAULT ""',
    referrer: 'VARCHAR(500) DEFAULT NULL',
    referrer_host: 'VARCHAR(200) DEFAULT NULL',
    utm_source: 'VARCHAR(200) DEFAULT NULL',
    utm_medium: 'VARCHAR(200) DEFAULT NULL',
    utm_campaign: 'VARCHAR(200) DEFAULT NULL',
    utm_term: 'VARCHAR(200) DEFAULT NULL',
    utm_content: 'VARCHAR(200) DEFAULT NULL',
    country: 'VARCHAR(100) DEFAULT NULL',
    city: 'VARCHAR(100) DEFAULT NULL',
    device: 'VARCHAR(50) DEFAULT NULL',
    browser: 'VARCHAR(50) DEFAULT NULL',
    os: 'VARCHAR(50) DEFAULT NULL',
    session_id: 'VARCHAR(64) DEFAULT NULL',
    ip_hash: 'VARCHAR(64) DEFAULT NULL',
    is_bot: 'TINYINT DEFAULT 0',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  },
  daily_stats: {
    // A literal default, not `(CURRENT_DATE)` — expression defaults need MySQL
    // 8.0.13+ and this has to work on whatever the host is running.
    date: "DATE NOT NULL DEFAULT '1970-01-01'",
    path: 'VARCHAR(500) DEFAULT NULL',
    country: 'VARCHAR(100) DEFAULT NULL',
    views: 'INT DEFAULT 0',
    visitors: 'INT DEFAULT 0',
  },
  media: {
    filename: 'VARCHAR(255) NOT NULL DEFAULT ""',
    path: 'VARCHAR(500) NOT NULL DEFAULT ""',
    width: 'INT DEFAULT NULL',
    height: 'INT DEFAULT NULL',
    size_bytes: 'BIGINT DEFAULT NULL',
    alt: 'VARCHAR(300) DEFAULT NULL',
    mime_type: 'VARCHAR(100) DEFAULT NULL',
    thumbnail_path: 'VARCHAR(500) DEFAULT NULL',
    blur_data: 'TEXT DEFAULT NULL',
    deleted_at: 'DATETIME DEFAULT NULL',
    uploaded_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  },
  audit_log: {
    user_id: 'INT DEFAULT NULL',
    user_email: 'VARCHAR(255) DEFAULT NULL',
    action: 'VARCHAR(64) NOT NULL DEFAULT ""',
    entity: 'VARCHAR(64) NOT NULL DEFAULT ""',
    entity_id: 'VARCHAR(64) DEFAULT NULL',
    before_json: 'JSON DEFAULT NULL',
    after_json: 'JSON DEFAULT NULL',
    meta_json: 'JSON DEFAULT NULL',
    ip_hash: 'VARCHAR(64) DEFAULT NULL',
    user_agent: 'VARCHAR(500) DEFAULT NULL',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  },
  schema_migrations: {
    name: 'VARCHAR(128) NOT NULL DEFAULT ""',
    applied_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  },
};

/**
 * Columns whose *type* matters, not just their presence.
 *
 * A pre-existing table can carry a narrower `VARCHAR` or a shorter `ENUM` than the
 * code writes — `settings.type` missing the `bool` member is why saving settings
 * failed with errno 1265 rather than 1054. `MODIFY COLUMN` is idempotent, so these
 * are simply re-applied on every repair.
 */
export const MODIFY_SPEC: [table: string, column: string, definition: string][] = [
  ['media', 'alt', 'VARCHAR(300) DEFAULT NULL'],
  ['settings', 'type', "ENUM('text','json','image','bool') NOT NULL DEFAULT 'text'"],
  ['settings', 'value', 'LONGTEXT DEFAULT NULL'],
  ['admin_users', 'role', "ENUM('admin','editor') NOT NULL DEFAULT 'editor'"],
  ['posts', 'status', "ENUM('draft','scheduled','published') NOT NULL DEFAULT 'draft'"],
  ['submissions', 'status', "ENUM('new','contacted','qualified','won','lost') NOT NULL DEFAULT 'new'"],
  ['submissions', 'mail_status', "ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending'"],
  ['menus', 'location', "ENUM('header','footer_services','footer_company','footer_contact') NOT NULL DEFAULT 'header'"],
  ['services', 'body', 'JSON DEFAULT NULL'],
];

/** Non-unique indexes matching the query shapes the app actually runs. */
export const INDEX_SPEC: [table: string, name: string, columns: string][] = [
  ['posts', 'idx_status_published', '`status`, `published_at`'],
  ['posts', 'idx_deleted_status_pub', '`deleted_at`, `status`, `published_at`'],
  ['services', 'idx_deleted_active_sort', '`deleted_at`, `is_active`, `sort_order`'],
  ['team_members', 'idx_deleted_active_sort', '`deleted_at`, `is_active`, `sort_order`'],
  ['media', 'idx_deleted_uploaded', '`deleted_at`, `uploaded_at`'],
  ['media', 'idx_path', '`path`(191)'],
  ['submissions', 'idx_deleted_status_created', '`deleted_at`, `status`, `created_at`'],
  ['pageviews', 'idx_bot_created', '`is_bot`, `created_at`'],
  ['pageviews', 'idx_created', '`created_at`'],
  ['daily_stats', 'idx_date', '`date`'],
  ['audit_log', 'idx_created', '`created_at`'],
  ['audit_log', 'idx_entity', '`entity`, `entity_id`'],
  ['menus', 'idx_location_sort', '`location`, `sort_order`'],
  // Matches the two shapes `lib/revisions.ts` reads: history for one post, newest
  // first, and the MAX(revision_number) lookup that assigns the next number.
  ['post_revisions', 'idx_post_created', '`post_id`, `created_at`'],
];

/**
 * Unique keys the app depends on for `ON DUPLICATE KEY UPDATE` to behave as an
 * upsert. These are attempted separately and are allowed to fail: a table that
 * already holds duplicate rows must be cleaned by hand, and a failure here does not
 * stop the rest of the repair.
 */
export const UNIQUE_SPEC: [table: string, name: string, columns: string][] = [
  ['settings', 'uniq_setting_key', '`key`'],
  ['services', 'uniq_service_slug', '`slug`'],
  ['posts', 'uniq_post_slug', '`slug`'],
  ['categories', 'uniq_category_slug', '`slug`'],
  ['admin_users', 'uniq_admin_email', '`email`'],
  ['schema_migrations', 'uniq_migration_name', '`name`'],
  // Two writers racing on the same post must not produce two revision #4s.
  ['post_revisions', 'uniq_post_revision', '`post_id`, `revision_number`'],
];

/** Tables that carry `deleted_at`, i.e. participate in soft delete. */
export const SOFT_DELETE_TABLES = ['posts', 'services', 'team_members', 'media', 'submissions'] as const;

/**
 * Values to move out of a legacy column and into the one the code reads.
 *
 * `#1072 - Key column 'key' doesn't exist in table` proved the live `settings` table has
 * no `key` column, so it was created by something older than this project and stores its
 * keys under a different name. Adding `key` fixes the errors, but the rows would then be
 * unreadable — the existing values need to come across too.
 *
 * Listed as `[table, target, candidateSources]`. Only one source per target can exist on
 * any given database; the rest are skipped. Rows whose target already holds a value are
 * never touched, so a repair can be re-run without overwriting later edits, and no
 * legacy column is ever dropped — the old data stays where it was as a safety net.
 */
export const BACKFILL_SPEC: [table: string, target: string, sources: string[]][] = [
  ['settings', 'key', ['setting_key', 'option_name', 'meta_key', 'name', 'skey']],
  ['settings', 'value', ['setting_value', 'option_value', 'meta_value', 'val']],
];
