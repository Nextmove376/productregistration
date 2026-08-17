-- ============================================================================
--  fix-schema-2.sql — bring an older productregistration database up to date
-- ============================================================================
--
--  Run this ONLY if you cannot reach the admin panel. The normal route is
--  Admin → Diagnostics → "Repair database", which does exactly the same work,
--  reports what it changed, and needs no SQL.
--
--  Why the previous script stopped halfway: phpMyAdmin aborts at the first error,
--  and a plain `ALTER TABLE … ADD COLUMN x` on a table that already has `x` is
--  error #1060. MySQL 8 has no `ADD COLUMN IF NOT EXISTS` (that is MariaDB only),
--  so every change below goes through a procedure that checks
--  information_schema first and skips silently. The whole file is safe to run
--  as many times as you like, in any order, on any state of the database.
--
--  Paste the entire file into phpMyAdmin → SQL → Go. Expect "0 rows affected"
--  messages; that is success, not failure.
-- ============================================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS nm_add_col $$
CREATE PROCEDURE nm_add_col(IN tbl VARCHAR(64), IN col VARCHAR(64), IN def TEXT)
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.TABLES
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl)
     AND NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col)
  THEN
    SET @s = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', def);
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END $$

DROP PROCEDURE IF EXISTS nm_mod_col $$
CREATE PROCEDURE nm_mod_col(IN tbl VARCHAR(64), IN col VARCHAR(64), IN def TEXT)
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col)
  THEN
    SET @s = CONCAT('ALTER TABLE `', tbl, '` MODIFY COLUMN `', col, '` ', def);
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END $$

DROP PROCEDURE IF EXISTS nm_add_idx $$
CREATE PROCEDURE nm_add_idx(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN cols TEXT, IN uniq TINYINT)
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.TABLES
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl)
     AND NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx)
  THEN
    SET @s = CONCAT('ALTER TABLE `', tbl, '` ADD ', IF(uniq = 1, 'UNIQUE ', ''), 'INDEX `', idx, '` (', cols, ')');
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END $$

DELIMITER ;

-- ---------------------------------------------------------------------------
-- Tables the newer code needs. `IF NOT EXISTS` is correct here — unlike for
-- columns, it does the right thing for a table that is genuinely absent.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  user_email VARCHAR(255) DEFAULT NULL,
  action VARCHAR(50) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  entity_id VARCHAR(64) DEFAULT NULL,
  before_json JSON DEFAULT NULL,
  after_json JSON DEFAULT NULL,
  ip_hash VARCHAR(64) DEFAULT NULL,
  user_agent VARCHAR(500) DEFAULT NULL,
  meta_json JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(190) NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Columns. These are the ones whose absence produced "Could not load services",
-- "Could not load the team", "Could not load analytics" and
-- "Could not save settings" — one missing column fails the whole query.
-- ---------------------------------------------------------------------------

-- Soft delete, used by every list query and by Trash.
CALL nm_add_col('posts',        'deleted_at', 'DATETIME DEFAULT NULL');
CALL nm_add_col('services',     'deleted_at', 'DATETIME DEFAULT NULL');
CALL nm_add_col('team_members', 'deleted_at', 'DATETIME DEFAULT NULL');
CALL nm_add_col('media',        'deleted_at', 'DATETIME DEFAULT NULL');
CALL nm_add_col('submissions',  'deleted_at', 'DATETIME DEFAULT NULL');

-- Login and session invalidation.
CALL nm_add_col('admin_users', 'is_active',       'TINYINT NOT NULL DEFAULT 1');
CALL nm_add_col('admin_users', 'session_version', 'INT NOT NULL DEFAULT 0');
CALL nm_add_col('admin_users', 'name',            'VARCHAR(120) DEFAULT NULL');
CALL nm_add_col('admin_users', 'last_login_at',   'DATETIME DEFAULT NULL');
CALL nm_add_col('admin_users', 'failed_attempts', 'INT NOT NULL DEFAULT 0');
CALL nm_add_col('admin_users', 'locked_until',    'DATETIME DEFAULT NULL');
UPDATE admin_users SET is_active = 1 WHERE is_active IS NULL;

-- Services: the admin list selects all of these.
CALL nm_add_col('services', 'tag',              'VARCHAR(50) DEFAULT NULL');
CALL nm_add_col('services', 'summary',          'VARCHAR(500) DEFAULT NULL');
CALL nm_add_col('services', 'body',             'JSON DEFAULT NULL');
CALL nm_add_col('services', 'icon',             'VARCHAR(100) DEFAULT NULL');
CALL nm_add_col('services', 'hero_image',       'VARCHAR(500) DEFAULT NULL');
CALL nm_add_col('services', 'sort_order',       'INT DEFAULT 0');
CALL nm_add_col('services', 'is_active',        'TINYINT DEFAULT 1');
CALL nm_add_col('services', 'meta_title',       'VARCHAR(200) DEFAULT NULL');
CALL nm_add_col('services', 'meta_description', 'VARCHAR(300) DEFAULT NULL');
CALL nm_add_col('services', 'og_image',         'VARCHAR(500) DEFAULT NULL');

-- Team: contact fields and ordering.
CALL nm_add_col('team_members', 'bio',        'TEXT DEFAULT NULL');
CALL nm_add_col('team_members', 'linkedin',   'VARCHAR(300) DEFAULT NULL');
CALL nm_add_col('team_members', 'photo_url',  'VARCHAR(500) DEFAULT NULL');
CALL nm_add_col('team_members', 'phone',      'VARCHAR(50) DEFAULT NULL');
CALL nm_add_col('team_members', 'email',      'VARCHAR(255) DEFAULT NULL');
CALL nm_add_col('team_members', 'whatsapp',   'VARCHAR(50) DEFAULT NULL');
CALL nm_add_col('team_members', 'sort_order', 'INT DEFAULT 0');
CALL nm_add_col('team_members', 'is_active',  'TINYINT DEFAULT 1');

-- Analytics: the breakdown panels read these from `pageviews`, the totals from
-- `daily_stats`. A single absent column used to blank the entire page.
CALL nm_add_col('pageviews', 'path',          'VARCHAR(300) NOT NULL DEFAULT ""');
CALL nm_add_col('pageviews', 'referrer_host', 'VARCHAR(200) DEFAULT NULL');
CALL nm_add_col('pageviews', 'device',        'VARCHAR(20) DEFAULT NULL');
CALL nm_add_col('pageviews', 'browser',       'VARCHAR(40) DEFAULT NULL');
CALL nm_add_col('pageviews', 'os',            'VARCHAR(40) DEFAULT NULL');
CALL nm_add_col('pageviews', 'country',       'VARCHAR(2) DEFAULT NULL');
CALL nm_add_col('pageviews', 'ip_hash',       'VARCHAR(64) DEFAULT NULL');
CALL nm_add_col('pageviews', 'is_bot',        'TINYINT NOT NULL DEFAULT 0');
CALL nm_add_col('pageviews', 'created_at',    'DATETIME DEFAULT CURRENT_TIMESTAMP');

CALL nm_add_col('daily_stats', 'path',     'VARCHAR(300) NOT NULL DEFAULT ""');
CALL nm_add_col('daily_stats', 'country',  'VARCHAR(2) DEFAULT NULL');
CALL nm_add_col('daily_stats', 'views',    'INT NOT NULL DEFAULT 0');
CALL nm_add_col('daily_stats', 'visitors', 'INT NOT NULL DEFAULT 0');

-- Posts and media.
CALL nm_add_col('posts', 'views',            'INT NOT NULL DEFAULT 0');
CALL nm_add_col('posts', 'reading_minutes',  'INT DEFAULT NULL');
CALL nm_add_col('posts', 'og_image',         'VARCHAR(500) DEFAULT NULL');
CALL nm_add_col('posts', 'canonical_url',    'VARCHAR(500) DEFAULT NULL');
CALL nm_add_col('posts', 'noindex',          'TINYINT NOT NULL DEFAULT 0');
CALL nm_add_col('posts', 'meta_title',       'VARCHAR(200) DEFAULT NULL');
CALL nm_add_col('posts', 'meta_description', 'VARCHAR(300) DEFAULT NULL');
CALL nm_add_col('posts', 'image_alt',        'VARCHAR(300) DEFAULT NULL');
CALL nm_add_col('posts', 'published_at',     'DATETIME DEFAULT NULL');

CALL nm_add_col('media', 'mime_type',      'VARCHAR(100) DEFAULT NULL');
CALL nm_add_col('media', 'thumbnail_path', 'VARCHAR(500) DEFAULT NULL');
CALL nm_add_col('media', 'blur_data',      'TEXT DEFAULT NULL');
CALL nm_add_col('media', 'alt',            'VARCHAR(300) DEFAULT NULL');
CALL nm_add_col('media', 'width',          'INT DEFAULT NULL');
CALL nm_add_col('media', 'height',         'INT DEFAULT NULL');
CALL nm_add_col('media', 'size_bytes',     'INT DEFAULT NULL');

-- Submissions: lead pipeline and mail delivery state.
CALL nm_add_col('submissions', 'notes',       'TEXT DEFAULT NULL');
CALL nm_add_col('submissions', 'mail_status', "ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending'");
CALL nm_add_col('submissions', 'mail_error',  'VARCHAR(500) DEFAULT NULL');
CALL nm_add_col('submissions', 'ip_hash',     'VARCHAR(64) DEFAULT NULL');
CALL nm_add_col('submissions', 'country',     'VARCHAR(2) DEFAULT NULL');
CALL nm_add_col('submissions', 'device',      'VARCHAR(20) DEFAULT NULL');
CALL nm_add_col('submissions', 'browser',     'VARCHAR(40) DEFAULT NULL');

-- Settings: `type` is what "Could not save settings" was about.
CALL nm_add_col('settings', 'type',       "ENUM('text','json','image','bool') NOT NULL DEFAULT 'text'");
CALL nm_add_col('settings', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- ---------------------------------------------------------------------------
-- Widen the types the app writes. An ENUM that predates a member rejects it
-- with #1265 mid-transaction, which is the other half of the settings failure.
-- ---------------------------------------------------------------------------

CALL nm_mod_col('settings',    'type',        "ENUM('text','json','image','bool') NOT NULL DEFAULT 'text'");
CALL nm_mod_col('settings',    'value',       'LONGTEXT DEFAULT NULL');
CALL nm_mod_col('media',       'alt',         'VARCHAR(300) DEFAULT NULL');
CALL nm_mod_col('admin_users', 'role',        "ENUM('admin','editor') NOT NULL DEFAULT 'editor'");
CALL nm_mod_col('posts',       'status',      "ENUM('draft','scheduled','published') NOT NULL DEFAULT 'draft'");
CALL nm_mod_col('submissions', 'status',      "ENUM('new','contacted','qualified','won','lost') NOT NULL DEFAULT 'new'");
CALL nm_mod_col('submissions', 'mail_status', "ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending'");
CALL nm_mod_col('services',    'body',        'JSON DEFAULT NULL');

-- ---------------------------------------------------------------------------
-- Indexes. The unique key on `settings`.`key` is the one that matters most:
-- without it the settings upsert appended a second row on every save.
-- ---------------------------------------------------------------------------

CALL nm_add_idx('settings',     'uniq_setting_key',     '`key`',                   1);
CALL nm_add_idx('services',     'uniq_service_slug',    '`slug`',                  1);
CALL nm_add_idx('posts',        'uniq_post_slug',       '`slug`',                  1);
CALL nm_add_idx('categories',   'uniq_category_slug',   '`slug`',                  1);
CALL nm_add_idx('admin_users',  'uniq_admin_email',     '`email`',                 1);

CALL nm_add_idx('posts',        'idx_posts_listing',    '`deleted_at`, `status`, `published_at`', 0);
CALL nm_add_idx('services',     'idx_services_listing', '`deleted_at`, `is_active`, `sort_order`', 0);
CALL nm_add_idx('team_members', 'idx_team_listing',     '`deleted_at`, `is_active`, `sort_order`', 0);
CALL nm_add_idx('media',        'idx_media_listing',    '`deleted_at`, `uploaded_at`', 0);
CALL nm_add_idx('submissions',  'idx_subs_listing',     '`deleted_at`, `status`, `created_at`', 0);
CALL nm_add_idx('pageviews',    'idx_pv_created',       '`created_at`, `is_bot`',   0);
CALL nm_add_idx('daily_stats',  'idx_daily_date',       '`date`',                  0);
CALL nm_add_idx('audit_log',    'idx_audit_created',    '`created_at`',            0);
CALL nm_add_idx('audit_log',    'idx_audit_entity',     '`entity`, `entity_id`',   0);

-- ---------------------------------------------------------------------------
-- The six service pages, so /admin/services is not empty.
--
-- These pages exist as code routes (app/services/<slug>/page.tsx) and were never
-- database rows, which is why the admin list showed nothing while the live site
-- showed six services. `INSERT IGNORE` plus the unique key above means an
-- existing row — including one you have already edited — is left untouched.
-- ---------------------------------------------------------------------------

INSERT IGNORE INTO services (slug, title, tag, summary, icon, sort_order, is_active) VALUES
  ('product-registration',  'Product Registration',  'Product Compliance',        'Register cosmetics, food, supplements, and consumer products with Dubai Municipality, ESMA, and MOIAT.', 'package',   1, 1),
  ('mohap-registration',    'MOHAP Registration',    'Healthcare Regulatory',     'Register medical devices, pharmaceuticals, and health products with the UAE Ministry of Health.',        'shield',    2, 1),
  ('business-setup',        'Business Setup',        'Company Formation',         'Mainland, freezone, and offshore company formation in Dubai and the UAE.',                                'building',  3, 1),
  ('mofa-attestation',      'MOFA Attestation',      'Government Services',       'Document attestation, embassy legalization, and PRO services in Dubai.',                                  'file-text', 4, 1),
  ('medical-drugstore',     'Medical & Drugstore',   'Healthcare Business',       'Pharmacy setup, drugstore licensing, and trademark registration.',                                        'cross',     5, 1),
  ('regulatory-approvals',  'Regulatory Approvals',  'Compliance & Certification','ESMA certification, GMP verification, Halal certification, and lab testing.',                             'check',     6, 1);

-- ---------------------------------------------------------------------------
-- Tidy up, then verify.
-- ---------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS nm_add_col;
DROP PROCEDURE IF EXISTS nm_mod_col;
DROP PROCEDURE IF EXISTS nm_add_idx;

-- Every row below must read OK. Anything reading MISSING means that column did
-- not get added — copy the row and send it over.
SELECT 'services.og_image'      AS checkpoint, IF(COUNT(*) > 0, 'OK', 'MISSING') AS result FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services'     AND COLUMN_NAME = 'og_image'
UNION ALL SELECT 'services.deleted_at',      IF(COUNT(*) > 0, 'OK', 'MISSING') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services'     AND COLUMN_NAME = 'deleted_at'
UNION ALL SELECT 'team_members.whatsapp',    IF(COUNT(*) > 0, 'OK', 'MISSING') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'team_members' AND COLUMN_NAME = 'whatsapp'
UNION ALL SELECT 'pageviews.os',             IF(COUNT(*) > 0, 'OK', 'MISSING') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pageviews'    AND COLUMN_NAME = 'os'
UNION ALL SELECT 'daily_stats.country',      IF(COUNT(*) > 0, 'OK', 'MISSING') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_stats'  AND COLUMN_NAME = 'country'
UNION ALL SELECT 'settings.type',            IF(COUNT(*) > 0, 'OK', 'MISSING') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'settings'     AND COLUMN_NAME = 'type'
UNION ALL SELECT 'settings unique key',      IF(COUNT(*) > 0, 'OK', 'MISSING') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'settings'  AND NON_UNIQUE = 0 AND COLUMN_NAME = 'key'
UNION ALL SELECT 'audit_log table',          IF(COUNT(*) > 0, 'OK', 'MISSING') FROM information_schema.TABLES  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_log'
UNION ALL SELECT 'services rows seeded',     IF(COUNT(*) >= 6, 'OK', CONCAT('ONLY ', COUNT(*))) FROM services;
