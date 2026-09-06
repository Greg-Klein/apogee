import Database from 'better-sqlite3';
import path from 'node:path';
import { existsSync } from 'node:fs';

/**
 * Read-only handle on the synced snapshot.
 *
 * The database is a build artefact of `npm run data`; the app never writes to it.
 * A missing file is surfaced as `null` so pages can render an explicit
 * "source unavailable" state instead of crashing.
 */

const DB_PATH = process.env.SPACEX_DB_PATH ?? path.join(process.cwd(), 'data', 'spacex.db');

declare global {
  var __spacexDb: Database.Database | null | undefined;
}

export function getDb(): Database.Database | null {
  if (globalThis.__spacexDb !== undefined) return globalThis.__spacexDb;
  if (!existsSync(DB_PATH)) {
    globalThis.__spacexDb = null;
    return null;
  }
  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  db.pragma('journal_mode = WAL');
  globalThis.__spacexDb = db;
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
