-- ============================================================================
--  fix-schema.sql — safe to run as many times as you like
-- ============================================================================
--
--  WHY YOU ARE RUNNING THIS
--
--  The admin panel showed "Could not load services" and "0 service(s)" because
--  `SELECT ... FROM services WHERE deleted_at IS NULL` fails when the
--  `deleted_at` column is missing. The same query shape is used for posts,
--  media, team members and submissions, so all of those are fixed here too.
--  The public pages hid the same failure by falling back to hardcoded content —
--  which is exactly why the site looked "unchanged" after each deploy.
--
--  HOW TO RUN IT
--
--  phpMyAdmin → pick your database in the left sidebar → SQL tab → paste this
--  whole file → Go. Then redeploy (or just wait 5 minutes — the pages now
--  refresh themselves).
--
--  WHY IT CANNOT FAIL LIKE LAST TIME
--
--  MySQL 8 has no `ADD COLUMN IF NOT EXISTS` (that is MariaDB-only), which is
--  what produced `#1060 - Duplicate column name`. Every statement below asks
--  `information_schema` whether the column or index already exists and builds
--  either a real ALTER or a harmless SELECT. Nothing here can raise #1060 or
--  #1061, and running it twice is a no-op the second time.
-- ============================================================================


-- ---------------------------------------------------------------------------
--  1. deleted_at — the column the admin panel is actually asking for
-- ---------------------------------------------------------------------------

SET @s := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services' AND COLUMN_NAME = 'deleted_at'),
  'SELECT ''services.deleted_at: already present'' AS result',
  'ALTER TABLE services ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'deleted_at'),
  'SELECT ''posts.deleted_at: already present'' AS result',
  'ALTER TABLE posts ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'team_members' AND COLUMN_NAME = 'deleted_at'),
  'SELECT ''team_members.deleted_at: already present'' AS result',
  'ALTER TABLE team_members ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media' AND COLUMN_NAME = 'deleted_at'),
  'SELECT ''media.deleted_at: already present'' AS result',
  'ALTER TABLE media ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'submissions' AND COLUMN_NAME = 'deleted_at'),
  'SELECT ''submissions.deleted_at: already present'' AS result',
  'ALTER TABLE submissions ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;


-- ---------------------------------------------------------------------------
--  2. Indexes for those columns — every list query filters on deleted_at
-- ---------------------------------------------------------------------------

SET @s := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services' AND INDEX_NAME = 'idx_services_deleted'),
  'SELECT ''idx_services_deleted: already present'' AS result',
  'CREATE INDEX idx_services_deleted ON services (deleted_at)'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts' AND INDEX_NAME = 'idx_posts_deleted'),
  'SELECT ''idx_posts_deleted: already present'' AS result',
  'CREATE INDEX idx_posts_deleted ON posts (deleted_at, status, published_at)'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'team_members' AND INDEX_NAME = 'idx_team_deleted'),
  'SELECT ''idx_team_deleted: already present'' AS result',
  'CREATE INDEX idx_team_deleted ON team_members (deleted_at)'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media' AND INDEX_NAME = 'idx_media_deleted'),
  'SELECT ''idx_media_deleted: already present'' AS result',
  'CREATE INDEX idx_media_deleted ON media (deleted_at, uploaded_at)'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'submissions' AND INDEX_NAME = 'idx_submissions_deleted'),
  'SELECT ''idx_submissions_deleted: already present'' AS result',
  'CREATE INDEX idx_submissions_deleted ON submissions (deleted_at, status, created_at)'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;


-- ---------------------------------------------------------------------------
--  3. admin_users — the columns the session check reads on every request
--
--  lib/dal.ts re-reads is_active and session_version to verify a session. If
--  either column is missing that query errors and every admin request looks
--  unauthenticated, which is the "Unauthorized" you saw after logging in.
-- ---------------------------------------------------------------------------

SET @s := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_users' AND COLUMN_NAME = 'is_active'),
  'SELECT ''admin_users.is_active: already present'' AS result',
  'ALTER TABLE admin_users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_users' AND COLUMN_NAME = 'session_version'),
  'SELECT ''admin_users.session_version: already present'' AS result',
  'ALTER TABLE admin_users ADD COLUMN session_version INT NOT NULL DEFAULT 0'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- Anyone created before is_active existed must be able to log in.
UPDATE admin_users SET is_active = 1 WHERE is_active IS NULL;


-- ---------------------------------------------------------------------------
--  4. media — the three columns that were added by hand, plus wider alt text
-- ---------------------------------------------------------------------------

SET @s := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media' AND COLUMN_NAME = 'mime_type'),
  'SELECT ''media.mime_type: already present'' AS result',
  'ALTER TABLE media ADD COLUMN mime_type VARCHAR(100) DEFAULT NULL'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media' AND COLUMN_NAME = 'thumbnail_path'),
  'SELECT ''media.thumbnail_path: already present'' AS result',
  'ALTER TABLE media ADD COLUMN thumbnail_path VARCHAR(500) DEFAULT NULL'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media' AND COLUMN_NAME = 'blur_data'),
  'SELECT ''media.blur_data: already present'' AS result',
  'ALTER TABLE media ADD COLUMN blur_data TEXT DEFAULT NULL'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- MODIFY is idempotent: re-running it just sets the same type again.
SET @s := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media' AND COLUMN_NAME = 'alt'),
  'ALTER TABLE media MODIFY COLUMN alt VARCHAR(300) DEFAULT NULL',
  'ALTER TABLE media ADD COLUMN alt VARCHAR(300) DEFAULT NULL'));
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;


-- ---------------------------------------------------------------------------
--  5. Supporting tables (naturally idempotent)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_log (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NULL,
  user_email    VARCHAR(255) NULL,
  action        VARCHAR(60) NOT NULL,
  entity        VARCHAR(60) NULL,
  entity_id     VARCHAR(64) NULL,
  before_json   JSON NULL,
  after_json    JSON NULL,
  ip_hash       VARCHAR(64) NULL,
  user_agent    VARCHAR(255) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_created (created_at),
  INDEX idx_audit_entity (entity, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(191) NOT NULL UNIQUE,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------------
--  6. Confirm it worked — every row below must say YES
-- ---------------------------------------------------------------------------

SELECT 'services.deleted_at'          AS column_checked,
       IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services'     AND COLUMN_NAME = 'deleted_at'),      'YES', 'MISSING') AS present
UNION ALL SELECT 'posts.deleted_at',
       IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts'        AND COLUMN_NAME = 'deleted_at'),      'YES', 'MISSING')
UNION ALL SELECT 'team_members.deleted_at',
       IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'team_members' AND COLUMN_NAME = 'deleted_at'),      'YES', 'MISSING')
UNION ALL SELECT 'media.deleted_at',
       IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media'        AND COLUMN_NAME = 'deleted_at'),      'YES', 'MISSING')
UNION ALL SELECT 'submissions.deleted_at',
       IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'submissions'  AND COLUMN_NAME = 'deleted_at'),      'YES', 'MISSING')
UNION ALL SELECT 'admin_users.is_active',
       IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_users'  AND COLUMN_NAME = 'is_active'),       'YES', 'MISSING')
UNION ALL SELECT 'admin_users.session_version',
       IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_users'  AND COLUMN_NAME = 'session_version'), 'YES', 'MISSING');

-- Should now return your six services without error:
SELECT id, slug, title, tag, is_active FROM services WHERE deleted_at IS NULL ORDER BY sort_order, title;
