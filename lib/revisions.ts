import type { PoolConnection } from 'mysql2/promise';
import pool from './db';
import { logger } from './logger';
import { presentColumns } from './schema';

/**
 * Snapshot history for blog posts.
 *
 * A post edit used to be destructive: the `UPDATE` in `app/api/blog/[id]/route.ts`
 * overwrote the body with no copy kept anywhere, so a bad paste or an accidental
 * select-all-delete was unrecoverable. `captureRevision` runs immediately before
 * that statement and files the row away as it stands.
 *
 * Two rules drive the whole design:
 *
 * 1. **History keeping must never cost the user their save.** Every function here
 *    that runs on the write path swallows its own failures and returns `null`. A
 *    missing revision is an inconvenience; a save that 500s because the history
 *    table is absent is a bug. That includes the case where this code ships before
 *    `009_post_revisions` has been run — errno 1146 is expected, not exceptional.
 * 2. **Restoring is itself an edit**, so it takes a snapshot of what it is about to
 *    overwrite. A restore that destroys the version it replaced would just be the
 *    original data-loss bug wearing a different hat.
 */

/** Actor recorded against a revision; shaped to accept a `SessionPayload` directly. */
export interface RevisionActor {
  userId: number;
  email: string;
}

export interface RevisionSummary {
  id: number;
  revision_number: number;
  title: string | null;
  author: string | null;
  status: string | null;
  note: string | null;
  edited_by_email: string | null;
  created_at: string;
  /** Body size only. The list endpoint must not ship every full body. */
  content_length: number;
}

export interface Revision extends RevisionSummary {
  post_id: number;
  slug: string | null;
  excerpt: string | null;
  content: string | null;
  featured_image: string | null;
  image_alt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  noindex: number | null;
  category_id: number | null;
  published_at: string | null;
  edited_by_id: number | null;
}

/* ------------------------------------------------------------------ *
 * Pure helpers — the parts worth unit testing, and the only definition
 * of these lists that the SQL below is allowed to use
 * ------------------------------------------------------------------ */

/**
 * The `posts` columns a revision preserves.
 *
 * This array is the single source of truth: the INSERT, the restore UPDATE and
 * `scripts/test-revisions.ts` all read it, so a column added to one path cannot
 * drift out of the others.
 */
export const SNAPSHOT_COLUMNS = [
  'title',
  'slug',
  'excerpt',
  'content',
  'featured_image',
  'image_alt',
  'meta_title',
  'meta_description',
  'og_image',
  'canonical_url',
  'status',
  'noindex',
  'category_id',
  'author',
  'published_at',
] as const;

/**
 * Columns a restore must never write back.
 *
 * `id` would repoint the row, `views` would roll a counter backwards to a number
 * that was never true, and `created_at`/`deleted_at` describe the post's lifecycle
 * rather than its content — restoring a `deleted_at` would silently re-trash a post
 * an admin had just recovered.
 */
export const NEVER_RESTORE = ['id', 'views', 'created_at', 'deleted_at'] as const;

/** How many revisions a post keeps before the oldest are dropped. */
export const DEFAULT_KEEP = 30;

/**
 * The snapshot list minus anything that must not be written back.
 *
 * Derived rather than hand-maintained so the two lists cannot disagree: adding a
 * column to `SNAPSHOT_COLUMNS` extends the restore automatically, and adding one to
 * `NEVER_RESTORE` removes it from the restore without a second edit.
 */
export function restoreColumns(snapshot: readonly string[] = SNAPSHOT_COLUMNS): string[] {
  const blocked = NEVER_RESTORE as readonly string[];
  return snapshot.filter((column) => !blocked.includes(column));
}

/**
 * `1` for a post with no history yet, otherwise one past the highest number.
 *
 * Takes the `COALESCE(MAX(...), 0)` result as-is — including the `null` a driver
 * hands back for an empty table — so the caller never has to special-case a post
 * whose first-ever edit this is.
 */
export function nextRevisionNumber(currentMax: number | null | undefined): number {
  const max = Number(currentMax ?? 0);
  return (Number.isFinite(max) && max > 0 ? Math.floor(max) : 0) + 1;
}

/**
 * Which revisions to delete, given every revision id newest-first.
 *
 * Split out from the SQL because "keeps the newest N" is the kind of off-by-one that
 * silently deletes one revision too many for months before anyone notices.
 */
export function revisionsToPrune(newestFirst: readonly number[], keep: number = DEFAULT_KEEP): number[] {
  if (!Number.isFinite(keep) || keep <= 0) return [...newestFirst];
  return newestFirst.slice(Math.floor(keep));
}

/* ------------------------------------------------------------------ *
 * Driver-error predicates and column resolution
 * ------------------------------------------------------------------ */

/**
 * MySQL's "table doesn't exist".
 *
 * Singled out because it is the one failure with a known, benign cause: the code is
 * deployed but `009_post_revisions` has not been run yet. Treating it as an error
 * would take the blog editor down until someone remembered to migrate.
 */
function isMissingTable(err: unknown): boolean {
  const e = err as { errno?: number; code?: string };
  return e?.errno === 1146 || e?.code === 'ER_NO_SUCH_TABLE';
}

function isDuplicateKey(err: unknown): boolean {
  const e = err as { errno?: number; code?: string };
  return e?.errno === 1062 || e?.code === 'ER_DUP_ENTRY';
}

/**
 * Snapshot columns present on **both** tables, in `SNAPSHOT_COLUMNS` order.
 *
 * Hardcoding the list would throw errno 1054 on any deployment whose `posts` table
 * predates one of the later migrations, and `INSERT ... SELECT` needs both sides to
 * line up anyway. An empty result means `post_revisions` is missing, which callers
 * read as "not migrated yet".
 */
async function resolveSnapshotColumns(): Promise<string[]> {
  const onPosts = await presentColumns('posts', [...SNAPSHOT_COLUMNS]);
  return presentColumns('post_revisions', onPosts);
}

/**
 * Files one revision on an existing connection, inside the caller's transaction.
 *
 * The number comes from `MAX(revision_number) + 1` under `FOR UPDATE` so two
 * concurrent saves of the same post serialise instead of racing to the same number,
 * and the row itself is copied with a single `INSERT ... SELECT` — reading the post
 * into JavaScript first would leave a window where another writer's `UPDATE` lands
 * between the read and the insert, and the "before" snapshot would record the wrong
 * state.
 *
 * Returns `null` when the post no longer exists, which is not an error: nothing was
 * overwritten, so there is nothing to preserve.
 */
async function captureOnConnection(
  conn: PoolConnection,
  postId: number,
  columns: string[],
  opts: { actor?: RevisionActor | null; note?: string | null }
): Promise<number | null> {
  const [maxRows] = await conn.execute(
    `SELECT COALESCE(MAX(revision_number), 0) AS max_number
       FROM post_revisions WHERE post_id = ? FOR UPDATE`,
    [postId]
  );
  const revisionNumber = nextRevisionNumber((maxRows as { max_number: number }[])[0]?.max_number);

  // Identifiers come from `SNAPSHOT_COLUMNS` filtered against information_schema,
  // so they are never user input; values stay parameterised.
  const quoted = columns.map((column) => `\`${column}\``).join(', ');

  const [result] = await conn.execute(
    `INSERT INTO post_revisions
       (post_id, revision_number, edited_by_id, edited_by_email, note, ${quoted})
     SELECT ?, ?, ?, ?, ?, ${quoted}
       FROM posts WHERE id = ? LIMIT 1`,
    [
      postId,
      revisionNumber,
      opts.actor?.userId ?? null,
      opts.actor?.email?.slice(0, 255) ?? null,
      opts.note?.slice(0, 255) ?? null,
      postId,
    ]
  );

  return (result as { affectedRows?: number }).affectedRows ? revisionNumber : null;
}

/* ------------------------------------------------------------------ *
 * Write path
 * ------------------------------------------------------------------ */

export interface CaptureOptions {
  actor?: RevisionActor | null;
  /** Free text shown in the history table, e.g. `autosaved before edit`. */
  note?: string | null;
  /** Revisions to keep for this post; older ones are pruned after the commit. */
  keep?: number;
}

/**
 * Snapshots a post as it stands right now. Returns the new revision number, or
 * `null` if nothing was recorded.
 *
 * **This function does not throw.** It sits directly in front of the `UPDATE` in the
 * blog PUT handler, and the calling contract is that a failure here is invisible to
 * the user: they came to save a post, not to maintain an archive.
 */
export async function captureRevision(postId: number, opts: CaptureOptions = {}): Promise<number | null> {
  try {
    const columns = await resolveSnapshotColumns();
    if (columns.length === 0) {
      // No table (or no overlapping columns) — the migration has not been run.
      logger.warn('revisions.unavailable', { postId });
      return null;
    }

    /**
     * One retry on a duplicate key.
     *
     * `FOR UPDATE` gap-locks the `post_id` range under REPEATABLE READ, so two
     * concurrent saves normally serialise. It is not a guarantee across every
     * isolation level a shared host might be configured with, and this project has
     * already shipped one ER_DUP_ENTRY bug to users. The second attempt re-reads the
     * now-committed maximum and takes the next number.
     */
    for (let attempt = 1; attempt <= 2; attempt++) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const revisionNumber = await captureOnConnection(conn, postId, columns, opts);
        await conn.commit();

        // After the commit, and non-throwing by construction: history that grew one
        // row too long is not worth failing a save over.
        if (revisionNumber !== null) await pruneRevisions(postId, opts.keep ?? DEFAULT_KEEP);

        return revisionNumber;
      } catch (err) {
        await conn.rollback().catch(() => {});
        if (attempt === 1 && isDuplicateKey(err)) continue;
        throw err;
      } finally {
        conn.release();
      }
    }

    return null;
  } catch (err) {
    if (isMissingTable(err)) {
      logger.warn('revisions.table_missing', { postId });
      return null;
    }
    logger.error('revisions.capture_failed', { err, postId });
    return null;
  }
}

/**
 * Drops everything but the newest `keep` revisions of a post. Returns rows deleted.
 *
 * Unbounded history is a real cost on shared hosting: one heavily edited post with a
 * long body would otherwise hold a copy of that body for every save it ever had.
 *
 * Never throws — it runs on the save path.
 */
export async function pruneRevisions(postId: number, keep: number = DEFAULT_KEEP): Promise<number> {
  const limit = Number.isFinite(keep) && keep > 0 ? Math.floor(keep) : 0;

  try {
    if (limit === 0) {
      const [wiped] = await pool.execute('DELETE FROM post_revisions WHERE post_id = ?', [postId]);
      return (wiped as { affectedRows?: number }).affectedRows ?? 0;
    }

    /**
     * `limit` is interpolated, not bound.
     *
     * MySQL will not accept a placeholder for `LIMIT` inside a derived table, which
     * is the same reason the media listing interpolates its page size. The value is
     * floored to a positive integer immediately above, so nothing user-supplied
     * reaches the SQL text.
     */
    const [result] = await pool.execute(
      `DELETE FROM post_revisions
        WHERE post_id = ?
          AND id NOT IN (
            SELECT id FROM (
              SELECT id FROM post_revisions
               WHERE post_id = ?
               ORDER BY revision_number DESC
               LIMIT ${limit}
            ) AS keepers
          )`,
      [postId, postId]
    );

    return (result as { affectedRows?: number }).affectedRows ?? 0;
  } catch (err) {
    if (!isMissingTable(err)) logger.error('revisions.prune_failed', { err, postId });
    return 0;
  }
}

/* ------------------------------------------------------------------ *
 * Read path
 * ------------------------------------------------------------------ */

/**
 * Every revision of a post, newest first — without the bodies.
 *
 * `content_length` stands in for the body so the history screen can show size at a
 * glance. Shipping 30 full post bodies to render one table would be a needlessly
 * expensive response on shared hosting.
 *
 * An unmigrated table reads as "no history", so the screen renders empty instead of
 * erroring. Any other driver failure propagates to the caller, which reports it.
 */
export async function listRevisions(postId: number): Promise<RevisionSummary[]> {
  try {
    const [rows] = await pool.execute(
      `SELECT id, revision_number, title, author, status, note, edited_by_email, created_at,
              CHAR_LENGTH(COALESCE(content, '')) AS content_length
         FROM post_revisions
        WHERE post_id = ?
        ORDER BY revision_number DESC`,
      [postId]
    );
    return rows as RevisionSummary[];
  } catch (err) {
    if (isMissingTable(err)) return [];
    throw err;
  }
}

/**
 * One full revision, scoped by `post_id`.
 *
 * The `post_id` predicate is not decoration: without it, an id guessed from another
 * post's history would be readable — and restorable — through this post's URL.
 */
export async function getRevision(postId: number, revisionId: number): Promise<Revision | null> {
  try {
    const [rows] = await pool.execute(
      `SELECT id, post_id, revision_number, title, slug, excerpt, content, featured_image,
              image_alt, meta_title, meta_description, og_image, canonical_url, status, noindex,
              category_id, author, published_at, edited_by_id, edited_by_email, note, created_at,
              CHAR_LENGTH(COALESCE(content, '')) AS content_length
         FROM post_revisions
        WHERE post_id = ? AND id = ?
        LIMIT 1`,
      [postId, revisionId]
    );
    return (rows as Revision[])[0] ?? null;
  } catch (err) {
    if (isMissingTable(err)) return null;
    throw err;
  }
}

/* ------------------------------------------------------------------ *
 * Restore
 * ------------------------------------------------------------------ */

export type RestoreFailure = 'unavailable' | 'post_not_found' | 'revision_not_found';

/** Carries a machine-readable reason so the route can pick the right status code. */
export class RevisionRestoreError extends Error {
  code: RestoreFailure;

  constructor(code: RestoreFailure, message: string) {
    super(message);
    this.name = 'RevisionRestoreError';
    this.code = code;
  }
}

/**
 * Writes a revision's values back onto the post.
 *
 * Unlike `captureRevision` this **does** throw: a restore is an explicit request, and
 * silently doing nothing would be worse than an error message.
 *
 * The current state is snapshotted first, in the same transaction, so the restore is
 * itself undoable — otherwise "restore" would be a destructive operation that
 * discards whatever it replaced, which is the exact bug this whole feature exists to
 * prevent. Either both writes land or neither does.
 */
export async function restoreRevision(
  postId: number,
  revisionId: number,
  actor?: RevisionActor | null
): Promise<void> {
  const columns = await resolveSnapshotColumns();
  if (columns.length === 0) {
    throw new RevisionRestoreError('unavailable', 'Post revisions are not available on this database yet.');
  }

  const targets = restoreColumns(columns);
  if (targets.length === 0) {
    throw new RevisionRestoreError('unavailable', 'No restorable columns are available.');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Locks the post for the transaction and proves it is not in the trash. Checking
    // the UPDATE's `affectedRows` instead would not work: MySQL reports 0 when the
    // restored values happen to equal the current ones, which is a success.
    const [postRows] = await conn.execute(
      'SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE',
      [postId]
    );
    if ((postRows as unknown[]).length === 0) {
      throw new RevisionRestoreError('post_not_found', 'Post not found');
    }

    const quoted = targets.map((column) => `\`${column}\``).join(', ');
    const [revisionRows] = await conn.execute(
      `SELECT revision_number, ${quoted}
         FROM post_revisions
        WHERE post_id = ? AND id = ?
        LIMIT 1`,
      [postId, revisionId]
    );
    const revision = (revisionRows as Record<string, unknown>[])[0];
    if (!revision) {
      throw new RevisionRestoreError('revision_not_found', 'Revision not found');
    }

    await captureOnConnection(conn, postId, columns, {
      actor,
      note: `restored from #${revision.revision_number}`,
    });

    const values: any[] = [...targets.map((column) => revision[column] ?? null), postId];
    await conn.execute(
      `UPDATE posts SET ${targets.map((column) => `\`${column}\` = ?`).join(', ')}
        WHERE id = ? AND deleted_at IS NULL`,
      values
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => {});
    if (err instanceof RevisionRestoreError) throw err;
    logger.error('revisions.restore_failed', { err, postId, revisionId });
    throw err;
  } finally {
    conn.release();
  }
}
