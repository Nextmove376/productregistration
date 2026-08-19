-- ===================================================================
-- Migration 009 — post_revisions
-- Paste into phpMyAdmin → SQL, run once. Safe to re-run.
-- Equivalent to: npm run db:migrate
-- ===================================================================
--
-- Every `CREATE TABLE IF NOT EXISTS` here is idempotent, so running this
-- twice does nothing the second time. It does NOT use the MariaDB-only
-- `ADD COLUMN IF NOT EXISTS`, which is what made the earlier migration
-- fail on MySQL 8.

-- 1. The migration ledger, so `npm run db:migrate` later agrees with what
--    you ran by hand and does not try to re-apply this.
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) UNIQUE NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Snapshot history for posts, written immediately before every update.
--
--    Column widths mirror `posts` exactly on purpose: a narrower column here
--    would truncate silently under a non-strict sql_mode, so the "backup"
--    would quietly differ from what it claims to preserve.
--
--    `status` is VARCHAR(20) rather than the ENUM used by `posts`, because
--    `INSERT ... SELECT` into a narrower ENUM would start failing the moment
--    `posts` gains a fourth status — turning a routine save into a 500.
--
--    Every snapshot column is nullable: a half-finished draft still deserves
--    a revision, and NOT NULL here would reject it.
--
--    There is deliberately no foreign key to `posts`. Posts are soft-deleted,
--    so revisions must outlive a trashed post, and a hard purge must not
--    silently take the history with it.
CREATE TABLE IF NOT EXISTS post_revisions (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Record it as applied, so the Node migrator skips it.
--    IGNORE makes this safe on a second run.
INSERT IGNORE INTO schema_migrations (name) VALUES ('009_post_revisions');

-- ===================================================================
-- Verify — run these SEPARATELY, after the statements above succeed.
--
-- Deliberately NOT using information_schema: the Hostinger database user
-- (u570403113_product_reg) is denied access to it and returns
-- "#1044 - Access denied for user ... to database 'information_schema'",
-- which aborts the whole batch even though the CREATE TABLEs above ran fine.
-- SHOW works on a restricted user because it only reports objects you own.
-- ===================================================================
-- SHOW TABLES LIKE 'post_revisions';
-- SHOW COLUMNS FROM post_revisions;
-- SELECT name, applied_at FROM schema_migrations WHERE name = '009_post_revisions';
