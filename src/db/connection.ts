import Database from 'better-sqlite3';

import { loadConfig } from '../config.js';

let dbInstance: Database.Database | null = null;

export const getDb = (): Database.Database => {
  if (dbInstance) return dbInstance;
  const cfg = loadConfig();
  if (!cfg.ORD_DB_URL.startsWith('sqlite:')) {
    throw new Error('Only sqlite URLs are supported in v0.1');
  }
  const file = cfg.ORD_DB_URL.replace('sqlite:', '');
  dbInstance = new Database(file, { fileMustExist: false });
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  return dbInstance;
};
