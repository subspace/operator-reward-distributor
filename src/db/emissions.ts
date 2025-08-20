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
  status: 'scheduled' | 'submitted' | 'confirmed' | 'failed' | 'skipped_budget';
}

/**
 * Idempotently reserve an emission for a given period.
 *
 * `INSERT OR IGNORE` against the UNIQUE `(chain_id, period_id)`
 * constraint so that only the first call per period creates a row and
 * creates the reservation. Later calls for the same period will
 * be ignored.
 *
 * Returns `true` when a new row was inserted (reservation acquired), and
 * `false` when the row already existed (reservation already taken).
 */
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
    chain_id: cfg.CHAIN_ID,
    period_id: periodId,
    remark_payload: '',
    tip_shannons: cfg.TIP_SHANNONS.toString(),
  });

  return result.changes === 1;
};

export const updateSubmitted = (
  periodId: number,
  fields: { extrinsic_hash: string; remark_payload: string }
): void => {
  const cfg = loadConfig();
  const db = getDb();
  const stmt = (db as Database.Database).prepare(
    `UPDATE emissions
     SET status='submitted', emitted_at=datetime('now'), extrinsic_hash=@extrinsic_hash, remark_payload=@remark_payload
     WHERE chain_id=@chain_id AND period_id=@period_id`
  );
  stmt.run({ chain_id: cfg.CHAIN_ID, period_id: periodId, ...fields });
};

export const updateInclusion = (
  periodId: number,
  fields: { block_hash: string; block_number: number }
): void => {
  const cfg = loadConfig();
  const db = getDb();
  const stmt = (db as Database.Database).prepare(
    `UPDATE emissions
     SET block_hash=@block_hash, block_number=@block_number
     WHERE chain_id=@chain_id AND period_id=@period_id`
  );
  stmt.run({ chain_id: cfg.CHAIN_ID, period_id: periodId, ...fields });
};

export const updateConfirmed = (periodId: number, fields: { confirmation_depth: number }): void => {
  const cfg = loadConfig();
  const db = getDb();
  const stmt = (db as Database.Database).prepare(
    `UPDATE emissions
     SET status='confirmed', confirmed_at=datetime('now'), confirmation_depth=@confirmation_depth
     WHERE chain_id=@chain_id AND period_id=@period_id`
  );
  stmt.run({ chain_id: cfg.CHAIN_ID, period_id: periodId, ...fields });
};

export const recordSkipped = (periodId: number, status: 'skipped_budget'): void => {
  const cfg = loadConfig();
  const db = getDb();
  const insert = (db as Database.Database).prepare(
    `INSERT OR IGNORE INTO emissions (
      chain_id, period_id, scheduled_at, remark_payload, tip_shannons, status
    ) VALUES (
      @chain_id, @period_id, datetime('now'), '', @tip_shannons, @status
    )`
  );
  insert.run({
    chain_id: cfg.CHAIN_ID,
    period_id: periodId,
    tip_shannons: cfg.TIP_SHANNONS.toString(),
    status,
  });
  const update = (db as Database.Database).prepare(
    `UPDATE emissions SET status=@status WHERE chain_id=@chain_id AND period_id=@period_id`
  );
  update.run({ chain_id: cfg.CHAIN_ID, period_id: periodId, status });
};

export const updateFailed = (periodId: number): void => {
  const cfg = loadConfig();
  const db = getDb();
  const stmt = (db as Database.Database).prepare(
    `UPDATE emissions
     SET status='failed'
     WHERE chain_id=@chain_id AND period_id=@period_id`
  );
  stmt.run({ chain_id: cfg.CHAIN_ID, period_id: periodId });
};

export const getSpentShannonsSince = (chainId: string, sinceIso: string): bigint => {
  const db = getDb();
  const row = (db as any)
    .prepare(
      `SELECT COALESCE(SUM(CAST(tip_shannons AS INTEGER)), 0) AS spent
       FROM emissions
       WHERE chain_id = ?
         AND status IN ('submitted','confirmed')
         AND emitted_at >= datetime(?)`
    )
    .get(chainId, sinceIso) as { spent: number };
  return BigInt(row.spent);
};
