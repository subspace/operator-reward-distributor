import * as fs from 'node:fs';
import * as path from 'node:path';

import { getDb } from './connection.js';

export const runMigrations = (): void => {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );
  `);

  const migrationsDir = path.join(process.cwd(), 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => /\d+_.*\.sql$/.test(f))
    .sort();

  const appliedStmt = db.prepare('SELECT name FROM _migrations ORDER BY id');
  const applied = new Set<string>(appliedStmt.all().map((r: any) => r.name));

  const insertStmt = db.prepare(
    "INSERT INTO _migrations (name, applied_at) VALUES (?, datetime('now'))"
  );

  db.exec('BEGIN');
  try {
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      db.exec(sql);
      insertStmt.run(file);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
};
