import type Database from 'better-sqlite3';

import { loadConfig } from '../config.js';

import { getDb } from './connection.js';

export interface EmissionRecord {
  id?: number;
  chain_id: string;
  period_id: number;
  scheduled_at?: string;
  remark_payload: string;
  tip_shannons: string;
  status: 'scheduled' | 'submitted' | 'confirmed' | 'failed' | 'skipped_budget' | 'paused';
}

export const reserveEmissionIfNeeded = (periodId: number): boolean => {
  const cfg = loadConfig();
  const db = getDb();

  const insertSql = `
    INSERT OR IGNORE INTO emissions (
      chain_id, period_id, scheduled_at, remark_payload, tip_shannons, status
    ) VALUES (
      @chain_id, @period_id, datetime('now'), @remark_payload, @tip_shannons, 'scheduled'
    )
  `;

  const stmt = (db as Database.Database).prepare(insertSql);
  const result = stmt.run({
    chain_id: cfg.ORD_CHAIN_ID,
    period_id: periodId,
    remark_payload: '',
    tip_shannons: cfg.ORD_TIP_SHANNONS.toString(),
  });

  return result.changes === 1;
};
