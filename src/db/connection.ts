import * as fs from 'node:fs';
import * as path from 'node:path';

import Database from 'better-sqlite3';

import { loadConfig } from '../config.js';

let dbInstance: Database.Database | null = null;

export const getDb = (): Database.Database => {
  if (dbInstance) return dbInstance;
  const cfg = loadConfig();
  if (!cfg.DB_URL.startsWith('sqlite:')) {
    throw new Error('Only sqlite URLs are supported in v0.1');
  }
  const file = cfg.DB_URL.replace('sqlite:', '');
  const dir = path.dirname(path.isAbsolute(file) ? file : path.join(process.cwd(), file));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  dbInstance = new Database(file, { fileMustExist: false });
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  return dbInstance;
};
