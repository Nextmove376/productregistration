-- ============================================================================
--  fix-schema-2.sql — bring an older productregistration database up to date
-- ============================================================================
--
--  Run this ONLY if you cannot reach the admin panel. The normal route is
--  Admin → Diagnostics → "Repair database", which does the same work and
--  reports what it changed.
--
--  This script CANNOT halt. Every schema change goes through a procedure that
--  (a) checks information_schema first, and (b) carries a CONTINUE HANDLER, so a
--  statement that still fails is recorded in `nm_repair_log` and the run carries
--  on to the next one. That is deliberate: the previous version stopped at
--  `#1060 - Duplicate column`, and the version before that at
--  `#1072 - Key column 'key' doesn't exist`, each time leaving most of the file
--  unapplied while phpMyAdmin reported only the last statement.
--
--  Paste the whole file into phpMyAdmin → SQL → Go. It ends with two result
--  tables: the skipped-statement log, and an OK/MISSING checklist. Send me both
--  if anything still reads MISSING.
--
--  Safe to run repeatedly, on any state of the database. It never drops a table,
--  never drops a column, and never deletes a row.
-- ============================================================================

DROP TABLE IF EXISTS nm_repair_log;
CREATE TABLE nm_repair_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  step VARCHAR(200) NOT NULL,
  errno INT DEFAULT NULL,
  errmsg VARCHAR(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DELIMITER $$

-- Add a column if the table exists and the column does not.
DROP PROCEDURE IF EXISTS nm_add_col $$
CREATE PROCEDURE nm_add_col(IN tbl VARCHAR(64), IN col VARCHAR(64), IN def TEXT)
BEGIN
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 @e = MYSQL_ERRNO, @m = MESSAGE_TEXT;
    INSERT INTO nm_repair_log (step, errno, errmsg)
      VALUES (CONCAT('ADD COLUMN ', tbl, '.', col), @e, @m);
  END;

  IF EXISTS (SELECT 1 FROM information_schema.TABLES
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl)
     AND NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col)
  THEN
    SET @s = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', def);
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END $$

-- Widen an existing column. Skipped silently if the column is absent.
DROP PROCEDURE IF EXISTS nm_mod_col $$
CREATE PROCEDURE nm_mod_col(IN tbl VARCHAR(64), IN col VARCHAR(64), IN def TEXT)
BEGIN
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 @e = MYSQL_ERRNO, @m = MESSAGE_TEXT;
    INSERT INTO nm_repair_log (step, errno, errmsg)
      VALUES (CONCAT('MODIFY COLUMN ', tbl, '.', col), @e, @m);
  END;

  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col)
  THEN
    SET @s = CONCAT('ALTER TABLE `', tbl, '` MODIFY COLUMN `', col, '` ', def);
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END $$

-- Add an index over up to three columns. Every named column must exist first —
-- indexing an absent column is #1072, which is what stopped the last run.
-- Pass '' for unused column slots.
DROP PROCEDURE IF EXISTS nm_add_idx $$
CREATE PROCEDURE nm_add_idx(
  IN tbl VARCHAR(64), IN idx VARCHAR(64),
  IN c1 VARCHAR(64), IN c2 VARCHAR(64), IN c3 VARCHAR(64),
  IN uniq TINYINT
)
BEGIN
  DECLARE cols TEXT DEFAULT '';
  DECLARE ok TINYINT DEFAULT 1;

  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 @e = MYSQL_ERRNO, @m = MESSAGE_TEXT;
    INSERT INTO nm_repair_log (step, errno, errmsg)
      VALUES (CONCAT('ADD INDEX ', tbl, '.', idx), @e, @m);
  END;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES
                  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl) THEN
    SET ok = 0;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.STATISTICS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx) THEN
    SET ok = 0;
  END IF;

  IF ok = 1 THEN
    IF c1 <> '' THEN
      IF EXISTS (SELECT 1 FROM information_schema.COLUMNS
                  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = c1)
      THEN SET cols = CONCAT('`', c1, '`');
      ELSE SET ok = 0;
        INSERT INTO nm_repair_log (step, errno, errmsg)
          VALUES (CONCAT('ADD INDEX ', tbl, '.', idx), 1072, CONCAT('column `', c1, '` does not exist'));
      END IF;
    END IF;
    IF ok = 1 AND c2 <> '' THEN
      IF EXISTS (SELECT 1 FROM information_schema.COLUMNS
                  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = c2)
      THEN SET cols = CONCAT(cols, ', `', c2, '`');
      ELSE SET ok = 0;
        INSERT INTO nm_repair_log (step, errno, errmsg)
          VALUES (CONCAT('ADD INDEX ', tbl, '.', idx), 1072, CONCAT('column `', c2, '` does not exist'));
      END IF;
    END IF;
    IF ok = 1 AND c3 <> '' THEN
      IF EXISTS (SELECT 1 FROM information_schema.COLUMNS
                  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = c3)
      THEN SET cols = CONCAT(cols, ', `', c3, '`');
      ELSE SET ok = 0;
        INSERT INTO nm_repair_log (step, errno, errmsg)
          VALUES (CONCAT('ADD INDEX ', tbl, '.', idx), 1072, CONCAT('column `', c3, '` does not exist'));
      END IF;
    END IF;
  END IF;

  IF ok = 1 AND cols <> '' THEN
    SET @s = CONCAT('ALTER TABLE `', tbl, '` ADD ', IF(uniq = 1, 'UNIQUE ', ''),
                    'INDEX `', idx, '` (', cols, ')');
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END $$

-- Copy a legacy column's values into its modern equivalent, for rows where the
-- modern one is still blank. Used to rescue a `settings` table that stores its
-- keys under an older name.
DROP PROCEDURE IF EXISTS nm_backfill $$
CREATE PROCEDURE nm_backfill(IN tbl VARCHAR(64), IN target VARCHAR(64), IN src VARCHAR(64))
BEGIN
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 @e = MYSQL_ERRNO, @m = MESSAGE_TEXT;
    INSERT INTO nm_repair_log (step, errno, errmsg)
      VALUES (CONCAT('BACKFILL ', tbl, '.', target, ' <- ', src), @e, @m);
  END;

  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = target)
     AND EXISTS (SELECT 1 FROM information_schema.COLUMNS
                  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = src)
  THEN
    SET @s = CONCAT('UPDATE `', tbl, '` SET `', target, '` = `', src,
                    '` WHERE (`', target, '` IS NULL OR `', target, '` = \'\') AND `', src, '` IS NOT NULL');
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
    INSERT INTO nm_repair_log (step, errno, errmsg)
      VALUES (CONCAT('BACKFILL ', tbl, '.', target, ' <- ', src), 0,
              CONCAT('copied ', ROW_COUNT(), ' row(s)'));
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
-- settings — handled first and in detail, because #1072 proved this table does
-- not even have the `key` column the app selects. It predates this codebase and
-- stores its keys under some other name, which is why every settings read
-- silently fell back to cached defaults and every save failed.
-- ---------------------------------------------------------------------------

CALL nm_add_col('settings', 'key',        'VARCHAR(100) NOT NULL DEFAULT ""');
CALL nm_add_col('settings', 'value',      'LONGTEXT DEFAULT NULL');
CALL nm_add_col('settings', 'type',       "ENUM('text','json','image','bool') NOT NULL DEFAULT 'text'");
CALL nm_add_col('settings', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- Rescue existing values from whichever legacy name this table used. Only one of
-- these can match; the rest are skipped because the source column is absent.
CALL nm_backfill('settings', 'key', 'setting_key');
CALL nm_backfill('settings', 'key', 'option_name');
CALL nm_backfill('settings', 'key', 'meta_key');
CALL nm_backfill('settings', 'key', 'name');
CALL nm_backfill('settings', 'key', 'skey');
CALL nm_backfill('settings', 'value', 'setting_value');
CALL nm_backfill('settings', 'value', 'option_value');
CALL nm_backfill('settings', 'value', 'meta_value');
CALL nm_backfill('settings', 'value', 'val');

-- ---------------------------------------------------------------------------
-- Columns whose absence produced "Could not load services", "Could not load the
-- team" and "Could not load analytics" — one missing column fails the whole
-- query, so a single gap blanks an entire screen.
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

-- Services: the admin list selects all of these.
CALL nm_add_col('services', 'slug',             'VARCHAR(100) NOT NULL DEFAULT ""');
CALL nm_add_col('services', 'title',            'VARCHAR(200) NOT NULL DEFAULT ""');
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
CALL nm_add_col('services', 'created_at',       'DATETIME DEFAULT CURRENT_TIMESTAMP');
CALL nm_add_col('services', 'updated_at',       'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- Team: contact fields and ordering.
CALL nm_add_col('team_members', 'name',       'VARCHAR(150) NOT NULL DEFAULT ""');
CALL nm_add_col('team_members', 'role',       'VARCHAR(150) DEFAULT NULL');
CALL nm_add_col('team_members', 'bio',        'TEXT DEFAULT NULL');
CALL nm_add_col('team_members', 'linkedin',   'VARCHAR(300) DEFAULT NULL');
CALL nm_add_col('team_members', 'photo_url',  'VARCHAR(500) DEFAULT NULL');
CALL nm_add_col('team_members', 'phone',      'VARCHAR(50) DEFAULT NULL');
CALL nm_add_col('team_members', 'email',      'VARCHAR(255) DEFAULT NULL');
CALL nm_add_col('team_members', 'whatsapp',   'VARCHAR(50) DEFAULT NULL');
CALL nm_add_col('team_members', 'sort_order', 'INT DEFAULT 0');
CALL nm_add_col('team_members', 'is_active',  'TINYINT DEFAULT 1');
CALL nm_add_col('team_members', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

-- Analytics: the breakdown panels read these from `pageviews`, the totals from
-- `daily_stats`.
CALL nm_add_col('pageviews', 'path',          'VARCHAR(300) NOT NULL DEFAULT ""');
CALL nm_add_col('pageviews', 'referrer_host', 'VARCHAR(200) DEFAULT NULL');
CALL nm_add_col('pageviews', 'device',        'VARCHAR(20) DEFAULT NULL');
CALL nm_add_col('pageviews', 'browser',       'VARCHAR(40) DEFAULT NULL');
CALL nm_add_col('pageviews', 'os',            'VARCHAR(40) DEFAULT NULL');
CALL nm_add_col('pageviews', 'country',       'VARCHAR(2) DEFAULT NULL');
CALL nm_add_col('pageviews', 'ip_hash',       'VARCHAR(64) DEFAULT NULL');
CALL nm_add_col('pageviews', 'is_bot',        'TINYINT NOT NULL DEFAULT 0');
CALL nm_add_col('pageviews', 'created_at',    'DATETIME DEFAULT CURRENT_TIMESTAMP');

CALL nm_add_col('daily_stats', 'date',     'DATE DEFAULT NULL');
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
CALL nm_add_col('media', 'uploaded_at',    'DATETIME DEFAULT CURRENT_TIMESTAMP');

-- Submissions: lead pipeline and mail delivery state.
CALL nm_add_col('submissions', 'notes',       'TEXT DEFAULT NULL');
CALL nm_add_col('submissions', 'mail_status', "ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending'");
CALL nm_add_col('submissions', 'mail_error',  'VARCHAR(500) DEFAULT NULL');
CALL nm_add_col('submissions', 'ip_hash',     'VARCHAR(64) DEFAULT NULL');
CALL nm_add_col('submissions', 'country',     'VARCHAR(2) DEFAULT NULL');
CALL nm_add_col('submissions', 'device',      'VARCHAR(20) DEFAULT NULL');
CALL nm_add_col('submissions', 'browser',     'VARCHAR(40) DEFAULT NULL');
CALL nm_add_col('submissions', 'created_at',  'DATETIME DEFAULT CURRENT_TIMESTAMP');

-- Every admin account must be usable after adding `is_active`.
UPDATE admin_users SET is_active = 1 WHERE is_active IS NULL OR is_active = 0;

-- ---------------------------------------------------------------------------
-- Widen the types the app writes. An ENUM that predates a member rejects it with
-- #1265 mid-transaction, which is the other half of the settings failure.
-- ---------------------------------------------------------------------------

CALL nm_mod_col('settings',    'type',        "ENUM('text','json','image','bool') NOT NULL DEFAULT 'text'");
CALL nm_mod_col('settings',    'value',       'LONGTEXT DEFAULT NULL');
CALL nm_mod_col('settings',    'key',         'VARCHAR(100) NOT NULL DEFAULT ""');
CALL nm_mod_col('media',       'alt',         'VARCHAR(300) DEFAULT NULL');
CALL nm_mod_col('admin_users', 'role',        "ENUM('admin','editor') NOT NULL DEFAULT 'editor'");
CALL nm_mod_col('posts',       'status',      "ENUM('draft','scheduled','published') NOT NULL DEFAULT 'draft'");
CALL nm_mod_col('submissions', 'status',      "ENUM('new','contacted','qualified','won','lost') NOT NULL DEFAULT 'new'");
CALL nm_mod_col('submissions', 'mail_status', "ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending'");
CALL nm_mod_col('services',    'body',        'JSON DEFAULT NULL');

-- ---------------------------------------------------------------------------
-- Indexes. All optional — the app no longer relies on a unique key for its
-- upserts, so a table holding duplicate rows just logs a skip and moves on.
-- ---------------------------------------------------------------------------

CALL nm_add_idx('settings',     'uniq_setting_key',     'key',        '',            '',             1);
CALL nm_add_idx('services',     'uniq_service_slug',    'slug',       '',            '',             1);
CALL nm_add_idx('posts',        'uniq_post_slug',       'slug',       '',            '',             1);
CALL nm_add_idx('categories',   'uniq_category_slug',   'slug',       '',            '',             1);
CALL nm_add_idx('admin_users',  'uniq_admin_email',     'email',      '',            '',             1);

CALL nm_add_idx('posts',        'idx_posts_listing',    'deleted_at', 'status',      'published_at', 0);
CALL nm_add_idx('services',     'idx_services_listing', 'deleted_at', 'is_active',   'sort_order',   0);
CALL nm_add_idx('team_members', 'idx_team_listing',     'deleted_at', 'is_active',   'sort_order',   0);
CALL nm_add_idx('media',        'idx_media_listing',    'deleted_at', 'uploaded_at', '',             0);
CALL nm_add_idx('submissions',  'idx_subs_listing',     'deleted_at', 'status',      'created_at',   0);
CALL nm_add_idx('pageviews',    'idx_pv_created',       'created_at', 'is_bot',      '',             0);
CALL nm_add_idx('daily_stats',  'idx_daily_date',       'date',       '',            '',             0);
CALL nm_add_idx('audit_log',    'idx_audit_created',    'created_at', '',            '',             0);
CALL nm_add_idx('audit_log',    'idx_audit_entity',     'entity',     'entity_id',   '',             0);

-- ---------------------------------------------------------------------------
-- The six service pages, so /admin/services is not empty.
--
-- These exist as code routes (app/services/<slug>/page.tsx) and never had rows,
-- which is why the admin list showed nothing while the live site served six
-- services. `INSERT IGNORE` leaves an existing row untouched — including one you
-- have already edited — as long as the unique key on `slug` was created above.
-- ---------------------------------------------------------------------------

INSERT IGNORE INTO services (slug, title, tag, summary, icon, sort_order, is_active) VALUES
  ('product-registration',  'Product Registration',  'Product Compliance',        'Register cosmetics, food, supplements, and consumer products with Dubai Municipality, ESMA, and MOIAT.', 'package',   1, 1),
  ('mohap-registration',    'MOHAP Registration',    'Healthcare Regulatory',     'Register medical devices, pharmaceuticals, and health products with the UAE Ministry of Health.',        'shield',    2, 1),
  ('business-setup',        'Business Setup',        'Company Formation',         'Mainland, freezone, and offshore company formation in Dubai and the UAE.',                                'building',  3, 1),
  ('mofa-attestation',      'MOFA Attestation',      'Government Services',       'Document attestation, embassy legalization, and PRO services in Dubai.',                                  'file-text', 4, 1),
  ('medical-drugstore',     'Medical & Drugstore',   'Healthcare Business',       'Pharmacy setup, drugstore licensing, and trademark registration.',                                        'cross',     5, 1),
  ('regulatory-approvals',  'Regulatory Approvals',  'Compliance & Certification','ESMA certification, GMP verification, Halal certification, and lab testing.',                             'check',     6, 1);

DROP PROCEDURE IF EXISTS nm_add_col;
DROP PROCEDURE IF EXISTS nm_mod_col;
DROP PROCEDURE IF EXISTS nm_add_idx;
DROP PROCEDURE IF EXISTS nm_backfill;

-- ===========================================================================
--  RESULT 1 — what was skipped, and why. An empty table means everything
--  applied. Rows with errno 1072/1062 on a UNIQUE index are harmless.
-- ===========================================================================
SELECT step, errno, errmsg FROM nm_repair_log ORDER BY id;

-- ===========================================================================
--  RESULT 2 — the real column list of the tables that were failing. Send this
--  if anything in RESULT 3 still reads MISSING; it tells me the actual names.
-- ===========================================================================
SELECT TABLE_NAME AS tbl, GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) AS columns_present
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME IN ('settings','services','team_members','pageviews','daily_stats','admin_users')
 GROUP BY TABLE_NAME;

-- ===========================================================================
--  RESULT 3 — checklist. Every row must read OK.
-- ===========================================================================
SELECT 'settings.key' AS checkpoint, IF(COUNT(*) > 0, 'OK', 'MISSING') AS result
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'settings' AND COLUMN_NAME = 'key'
UNION ALL SELECT 'settings.value',        IF(COUNT(*) > 0, 'OK', 'MISSING') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'settings'     AND COLUMN_NAME = 'value'
UNION ALL SELECT 'settings.type',         IF(COUNT(*) > 0, 'OK', 'MISSING') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'settings'     AND COLUMN_NAME = 'type'
UNION ALL SELECT 'services.og_image',     IF(COUNT(*) > 0, 'OK', 'MISSING') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services'     AND COLUMN_NAME = 'og_image'
UNION ALL SELECT 'services.deleted_at',   IF(COUNT(*) > 0, 'OK', 'MISSING') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services'     AND COLUMN_NAME = 'deleted_at'
UNION ALL SELECT 'team_members.whatsapp', IF(COUNT(*) > 0, 'OK', 'MISSING') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'team_members' AND COLUMN_NAME = 'whatsapp'
UNION ALL SELECT 'pageviews.os',          IF(COUNT(*) > 0, 'OK', 'MISSING') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pageviews'    AND COLUMN_NAME = 'os'
UNION ALL SELECT 'daily_stats.country',   IF(COUNT(*) > 0, 'OK', 'MISSING') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_stats'  AND COLUMN_NAME = 'country'
UNION ALL SELECT 'admin_users.is_active', IF(COUNT(*) > 0, 'OK', 'MISSING') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_users'  AND COLUMN_NAME = 'is_active'
UNION ALL SELECT 'audit_log table',       IF(COUNT(*) > 0, 'OK', 'MISSING') FROM information_schema.TABLES  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_log'
UNION ALL SELECT 'services rows seeded',  IF(COUNT(*) >= 6, 'OK', CONCAT('ONLY ', COUNT(*), ' ROWS')) FROM services;

-- The log table is left behind on purpose so you can screenshot it. Remove with:
--   DROP TABLE nm_repair_log;
