-- ============================================================
--  Admin panel hardening — schema migration
--  Run ONCE in phpMyAdmin (select your database first, then SQL tab).
--
--  Safe to re-run: if a column/table already exists MySQL returns
--    #1060 Duplicate column name   /  #1061 Duplicate key name
--  Those errors are HARMLESS — skip that statement and continue.
--
--  Works on both MySQL 8 and MariaDB (no version-specific syntax).
-- ============================================================


-- ------------------------------------------------------------
-- 1. Soft delete  (THIS IS WHAT THE BUILD IS FAILING ON)
--    Every list query now filters `deleted_at IS NULL`.
-- ------------------------------------------------------------
ALTER TABLE services      ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL;
ALTER TABLE posts         ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL;
ALTER TABLE team_members  ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL;
ALTER TABLE media         ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL;
ALTER TABLE submissions   ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL;

ALTER TABLE services      ADD INDEX idx_deleted_at (deleted_at);
ALTER TABLE posts         ADD INDEX idx_deleted_at (deleted_at);
ALTER TABLE team_members  ADD INDEX idx_deleted_at (deleted_at);
ALTER TABLE media         ADD INDEX idx_deleted_at (deleted_at);
ALTER TABLE submissions   ADD INDEX idx_deleted_at (deleted_at);


-- ------------------------------------------------------------
-- 2. Admin user flags
--    is_active       — deactivate an account without deleting it
--    session_version — bumping it revokes that user's live logins
-- ------------------------------------------------------------
ALTER TABLE admin_users ADD COLUMN is_active TINYINT NOT NULL DEFAULT 1;
ALTER TABLE admin_users ADD COLUMN session_version INT NOT NULL DEFAULT 0;


-- ------------------------------------------------------------
-- 3. Media columns
--    The first three are the ones added by hand previously —
--    included so a fresh database also gets them.
--    `alt` widens to 300 to match the API limit (was 200).
-- ------------------------------------------------------------
ALTER TABLE media ADD COLUMN mime_type VARCHAR(100) DEFAULT NULL;
ALTER TABLE media ADD COLUMN thumbnail_path VARCHAR(500) DEFAULT NULL;
ALTER TABLE media ADD COLUMN blur_data TEXT DEFAULT NULL;
ALTER TABLE media MODIFY COLUMN alt VARCHAR(300) DEFAULT NULL;
ALTER TABLE media ADD INDEX idx_path (path(191));


-- ------------------------------------------------------------
-- 4. Audit log
--    `before` / `after` are reserved words in MySQL — hence the
--    _json suffixes.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- 5. Query indexes matching the new filter shapes
-- ------------------------------------------------------------
ALTER TABLE posts        ADD INDEX idx_deleted_status_pub (deleted_at, status, published_at);
ALTER TABLE submissions  ADD INDEX idx_deleted_status_created (deleted_at, status, created_at);
ALTER TABLE media        ADD INDEX idx_deleted_uploaded (deleted_at, uploaded_at);
ALTER TABLE services     ADD INDEX idx_deleted_active_sort (deleted_at, is_active, sort_order);
ALTER TABLE team_members ADD INDEX idx_deleted_active_sort (deleted_at, is_active, sort_order);
ALTER TABLE pageviews    ADD INDEX idx_bot_created (is_bot, created_at);


-- ------------------------------------------------------------
-- 6. Migration ledger
--    Records these steps as applied, so a later `npm run db:migrate`
--    skips them instead of erroring.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) UNIQUE NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (name) VALUES
  ('001_base_tables'),
  ('002_media_extra_columns'),
  ('003_media_alt_widen'),
  ('004_admin_user_flags'),
  ('005_soft_delete'),
  ('006_audit_log'),
  ('007_query_indexes'),
  ('008_media_path_unique');


-- ------------------------------------------------------------
-- 7. Verify — all three should return rows
-- ------------------------------------------------------------
-- SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS
--   WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'deleted_at';
-- SELECT COLUMN_NAME FROM information_schema.COLUMNS
--   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_users'
--     AND COLUMN_NAME IN ('is_active','session_version');
-- SELECT COUNT(*) AS audit_log_exists FROM information_schema.TABLES
--   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_log';
