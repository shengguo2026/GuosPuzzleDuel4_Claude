/**
 * Database migrations, numbered 1..n and applied in order (DB-01). Never edit a
 * released migration: add a new one. Profiles, ledger, saves etc. arrive in M4.
 */
export interface Migration {
  version: number;
  name: string;
  up: string;
}

export const migrations: readonly Migration[] = [
  {
    version: 1,
    name: 'app-meta',
    up: `
      CREATE TABLE app_meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      ) STRICT;
      INSERT INTO app_meta (key, value) VALUES ('created_at', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
    `,
  },
];
