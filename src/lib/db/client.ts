import Database from 'better-sqlite3';
import path from 'node:path';
import { statSync } from 'node:fs';

/**
 * Read-only handle on the synced snapshot.
 *
 * The database is a build artefact of `npm run data`; the app never writes to it.
 * A missing file is surfaced as `null` so pages can render an explicit
 * "source unavailable" state instead of crashing.
 *
 * A rebuild swaps in a brand new file, which leaves any open handle pointing at the
 * now-unlinked inode. The handle is therefore keyed on the file's identity and
 * reopened when that changes, so a scheduled resync is picked up by a long-running
 * server without a restart.
 */

export const DB_PATH = process.env.SPACEX_DB_PATH ?? path.join(process.cwd(), 'data', 'spacex.db');

/** How long to trust the cached handle before re-checking the file on disk. */
const STAT_TTL_MS = 5_000;

type Cached = {
  db: Database.Database | null;
  /** Inode and mtime of the file the handle was opened on; null when absent. */
  identity: string | null;
  checkedAt: number;
};

declare global {
  var __spacexDb: Cached | undefined;
}

function identityOf(): string | null {
  try {
    const s = statSync(DB_PATH);
    return `${s.ino}:${s.size}:${s.mtimeMs}`;
  } catch {
    return null;
  }
}

export function getDb(): Database.Database | null {
  const now = Date.now();
  const cached = globalThis.__spacexDb;

  if (cached && now - cached.checkedAt < STAT_TTL_MS) return cached.db;

  const identity = identityOf();

  if (cached && cached.identity === identity) {
    cached.checkedAt = now;
    return cached.db;
  }

  // The file appeared, vanished, or was replaced by a rebuild: start a fresh handle.
  try {
    cached?.db?.close();
  } catch {
    /* already closed or never opened */
  }

  if (identity === null) {
    globalThis.__spacexDb = { db: null, identity: null, checkedAt: now };
    return null;
  }

  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  db.pragma('journal_mode = WAL');
  globalThis.__spacexDb = { db, identity, checkedAt: now };
  return db;
}

/** Thrown when a page needs data but the snapshot is absent. */
export class SourceUnavailableError extends Error {
  constructor() {
    super('Snapshot Launch Library introuvable. Lancez `npm run data`.');
    this.name = 'SourceUnavailableError';
  }
}

export function requireDb(): Database.Database {
  const db = getDb();
  if (!db) throw new SourceUnavailableError();
  return db;
}

export type SyncMeta = {
  source: string;
  syncedAt: string | null;
  builtAt: string | null;
  sourceLastUpdated: string | null;
  launchCount: number;
};

export function getSyncMeta(): SyncMeta | null {
  const db = getDb();
  if (!db) return null;
  const rows = db.prepare('SELECT key, value FROM sync_meta').all() as Array<{ key: string; value: string }>;
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    source: map.source ?? 'Launch Library 2',
    syncedAt: map.synced_at || null,
    builtAt: map.built_at || null,
    sourceLastUpdated: map.source_last_updated || null,
    launchCount: Number(map.launch_count ?? 0),
  };
}
