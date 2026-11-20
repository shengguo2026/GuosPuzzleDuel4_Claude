import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import {
  BACKUP_DIR,
  DB_FILE,
  DatabaseTooNewError,
  HostAlreadyRunningError,
  LOCK_FILE,
  openHostDatabase,
  readLockInfo,
} from '../src/db.js';
import { migrations, type Migration } from '../src/migrations.js';
import { tempDir } from './helpers.js';

const v2: Migration = {
  version: 2,
  name: 'test-table',
  up: 'CREATE TABLE test_items (id INTEGER PRIMARY KEY, label TEXT NOT NULL) STRICT;',
};

describe('host database (DB-01)', () => {
  it('DB-01: cold start creates the database in WAL mode at the latest version', () => {
    const dir = tempDir();
    const host = openHostDatabase(dir);
    try {
      expect(host.migration).toEqual({ from: 0, to: migrations.length, backupPath: null });
      expect(host.db.prepare('PRAGMA journal_mode').get()).toEqual({ journal_mode: 'wal' });
      expect(host.db.prepare("SELECT key FROM app_meta WHERE key = 'created_at'").get()).toEqual({
        key: 'created_at',
      });
      expect(fs.existsSync(path.join(dir, DB_FILE))).toBe(true);
      expect(readLockInfo(dir)?.pid).toBe(process.pid);
    } finally {
      host.close();
    }
    expect(fs.existsSync(path.join(dir, LOCK_FILE))).toBe(false);
  });

  it('DB-01: migrations back up the existing database first', () => {
    const dir = tempDir();
    const first = openHostDatabase(dir);
    first.db.exec("INSERT INTO app_meta (key, value) VALUES ('marker', 'before-v2')");
    first.close();

    const now = new Date('2026-11-20T12:00:00Z');
    const second = openHostDatabase(dir, { migrations: [...migrations, v2], now });
    try {
      expect(second.migration.from).toBe(1);
      expect(second.migration.to).toBe(2);
      const backup = second.migration.backupPath!;
      expect(path.dirname(backup)).toBe(path.join(dir, BACKUP_DIR));
      expect(path.basename(backup)).toBe('pre-migration-v1-to-v2-2026-11-20T12-00-00-000Z.sqlite');

      const copy = new DatabaseSync(backup, { readOnly: true });
      expect(copy.prepare('PRAGMA user_version').get()).toEqual({ user_version: 1 });
      expect(copy.prepare("SELECT value FROM app_meta WHERE key = 'marker'").get()).toEqual({
        value: 'before-v2',
      });
      copy.close();
      second.db.prepare('INSERT INTO test_items (label) VALUES (?)').run('ok');
    } finally {
      second.close();
    }
  });

  it('DB-01: a failing migration is rolled back and the data stays at the old version', () => {
    const dir = tempDir();
    openHostDatabase(dir).close();
    const broken: Migration = {
      version: 2,
      name: 'broken',
      up: 'CREATE TABLE x (a); SELECT * FROM missing;',
    };
    expect(() => openHostDatabase(dir, { migrations: [...migrations, broken] })).toThrow(
      /migration 2/,
    );
    const again = openHostDatabase(dir);
    expect(again.db.prepare('PRAGMA user_version').get()).toEqual({ user_version: 1 });
    expect(
      again.db.prepare("SELECT name FROM sqlite_master WHERE name = 'x'").get(),
    ).toBeUndefined();
    again.close();
  });

  it('DB-01: data from a newer game version is refused unchanged', () => {
    const dir = tempDir();
    openHostDatabase(dir, { migrations: [...migrations, v2] }).close();
    expect(() => openHostDatabase(dir)).toThrow(DatabaseTooNewError);
  });
});

describe('single host per data folder (D-25)', () => {
  it('OPS-03: a second host on the same data folder is refused and told where the first runs', () => {
    const dir = tempDir();
    const first = openHostDatabase(dir);
    first.updateLock({ url: 'http://127.0.0.1:3000/' });
    try {
      let error: unknown;
      try {
        openHostDatabase(dir);
      } catch (err) {
        error = err;
      }
      expect(error).toBeInstanceOf(HostAlreadyRunningError);
      expect((error as Error).message).toContain('already running at http://127.0.0.1:3000/');
      // The refused attempt must not remove the first host's lock file.
      expect(readLockInfo(dir)?.url).toBe('http://127.0.0.1:3000/');
    } finally {
      first.close();
    }
    openHostDatabase(dir).close();
  });

  it('OPS-03: the lock also holds against another process', () => {
    const dir = tempDir();
    const first = openHostDatabase(dir);
    const script = `
      import { DatabaseSync } from 'node:sqlite';
      const db = new DatabaseSync(process.argv[1], { timeout: 0 });
      try { db.exec('PRAGMA locking_mode = EXCLUSIVE'); db.exec('BEGIN EXCLUSIVE'); db.exec('COMMIT'); console.log('GOT-LOCK'); }
      catch (e) { console.log('REFUSED ' + e.message); }`;
    const run = () =>
      spawnSync(
        process.execPath,
        ['--no-warnings', '--input-type=module', '-e', script, path.join(dir, DB_FILE)],
        {
          encoding: 'utf8',
        },
      ).stdout;
    try {
      expect(run()).toMatch(/^REFUSED .*locked/);
    } finally {
      first.close();
    }
    expect(run()).toMatch(/^GOT-LOCK/);
  });

  it('OPS-03: a lock file left by a crashed host does not block the next start', () => {
    const dir = tempDir();
    fs.writeFileSync(
      path.join(dir, LOCK_FILE),
      JSON.stringify({
        pid: 999999,
        startedAt: '2026-11-19T00:00:00Z',
        url: 'http://127.0.0.1:3000/',
      }),
    );
    const host = openHostDatabase(dir);
    expect(readLockInfo(dir)?.pid).toBe(process.pid);
    host.close();
  });
});
