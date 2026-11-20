/**
 * Host database and single-instance lock (D-25, D-27; DB-01, OPS-03).
 *
 * SQLite via the built-in node:sqlite module, WAL journal. The connection runs
 * in EXCLUSIVE locking mode and takes the write lock at once, so a second host
 * on the same user-data directory cannot open the database: that is the
 * single-instance guarantee, and the operating system releases it even if the
 * host crashes. A small lock file next to it records PID, start time and URL so
 * the second host can say where the first one runs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { migrations as defaultMigrations, type Migration } from './migrations.js';

export const DB_FILE = 'gpd4.sqlite';
export const LOCK_FILE = 'host.lock';
export const BACKUP_DIR = 'backups';

export interface LockInfo {
  pid: number;
  startedAt: string;
  url?: string;
}

export class HostAlreadyRunningError extends Error {
  constructor(
    readonly dataDir: string,
    readonly other: LockInfo | null,
  ) {
    const where = other?.url ? ` at ${other.url}` : '';
    const who = other ? ` (process ${other.pid}, started ${other.startedAt})` : '';
    super(
      `Guo's Puzzle Duel IV is already running${where}${who}. ` +
        `Only one game host can use the data folder ${dataDir}. ` +
        `Use the open game, or close its window first.`,
    );
    this.name = 'HostAlreadyRunningError';
  }
}

export class DatabaseTooNewError extends Error {
  constructor(
    readonly dbVersion: number,
    readonly codeVersion: number,
  ) {
    super(
      `The saved data is from a newer version of the game (database v${dbVersion}, ` +
        `this game knows up to v${codeVersion}). Update the game; your data was not changed.`,
    );
    this.name = 'DatabaseTooNewError';
  }
}

export function readLockInfo(dataDir: string): LockInfo | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(dataDir, LOCK_FILE), 'utf8')) as LockInfo;
    return typeof parsed.pid === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

function isBusyError(err: unknown): boolean {
  const e = err as { code?: string; errcode?: number; message?: string };
  // SQLITE_BUSY = 5, SQLITE_LOCKED = 6
  return (
    e?.errcode === 5 ||
    e?.errcode === 6 ||
    /database is locked|SQLITE_BUSY/i.test(String(e?.message ?? ''))
  );
}

export interface MigrationResult {
  from: number;
  to: number;
  backupPath: string | null;
}

export interface HostDatabase {
  db: DatabaseSync;
  dataDir: string;
  migration: MigrationResult;
  /** Records the URL in the lock file once the port is bound. */
  updateLock(info: Partial<LockInfo>): void;
  close(): void;
}

function userVersion(db: DatabaseSync): number {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
  return row.user_version;
}

function timestamp(now: Date): string {
  return now.toISOString().replace(/[:.]/g, '-');
}

/**
 * Applies pending migrations in order. Before changing a database that already
 * holds data (version > 0), a copy is written to backups/ (DB-01).
 */
export function migrate(
  db: DatabaseSync,
  dataDir: string,
  list: readonly Migration[] = defaultMigrations,
  now: Date = new Date(),
): MigrationResult {
  const sorted = [...list].sort((a, b) => a.version - b.version);
  sorted.forEach((m, i) => {
    if (m.version !== i + 1) throw new Error(`Migrations must be numbered 1..n; got ${m.version}`);
  });
  const latest = sorted.length;
  const from = userVersion(db);
  if (from > latest) throw new DatabaseTooNewError(from, latest);
  if (from === latest) return { from, to: from, backupPath: null };

  let backupPath: string | null = null;
  if (from > 0) {
    const dir = path.join(dataDir, BACKUP_DIR);
    fs.mkdirSync(dir, { recursive: true });
    backupPath = path.join(dir, `pre-migration-v${from}-to-v${latest}-${timestamp(now)}.sqlite`);
    // VACUUM INTO writes a consistent copy through SQLite (never a raw WAL copy).
    db.prepare('VACUUM INTO ?').run(backupPath);
  }

  for (const m of sorted.slice(from)) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(m.up);
      db.exec(`PRAGMA user_version = ${m.version}`);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw new Error(`Database migration ${m.version} (${m.name}) failed: ${String(err)}`, {
        cause: err,
      });
    }
  }
  return { from, to: latest, backupPath };
}

/**
 * Opens the user-data database, takes the single-instance lock, and migrates.
 * Throws HostAlreadyRunningError when another host holds the data folder.
 */
export function openHostDatabase(
  dataDir: string,
  options: { migrations?: readonly Migration[]; now?: Date } = {},
): HostDatabase {
  fs.mkdirSync(dataDir, { recursive: true });
  const lockPath = path.join(dataDir, LOCK_FILE);
  const db = new DatabaseSync(path.join(dataDir, DB_FILE), { timeout: 0 });
  try {
    db.exec('PRAGMA locking_mode = EXCLUSIVE');
    db.exec('PRAGMA journal_mode = WAL');
    // Take and keep the exclusive lock now (held until close in EXCLUSIVE mode).
    db.exec('BEGIN EXCLUSIVE');
    db.exec('COMMIT');
  } catch (err) {
    db.close();
    if (isBusyError(err)) throw new HostAlreadyRunningError(dataDir, readLockInfo(dataDir));
    throw err;
  }

  let lock: LockInfo = { pid: process.pid, startedAt: (options.now ?? new Date()).toISOString() };
  const writeLock = () => fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
  let migration: MigrationResult;
  try {
    writeLock();
    db.exec('PRAGMA foreign_keys = ON');
    migration = migrate(db, dataDir, options.migrations, options.now);
  } catch (err) {
    db.close();
    fs.rmSync(lockPath, { force: true });
    throw err;
  }

  let closed = false;
  return {
    db,
    dataDir,
    migration,
    updateLock(info) {
      lock = { ...lock, ...info };
      writeLock();
    },
    close() {
      if (closed) return;
      closed = true;
      db.close();
      // Remove the lock file only if it is still ours.
      if (readLockInfo(dataDir)?.pid === process.pid) fs.rmSync(lockPath, { force: true });
    },
  };
}
