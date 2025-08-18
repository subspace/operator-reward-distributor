import type Database from 'better-sqlite3';

import { loadConfig } from '../config.js';

import { getDb } from './connection.js';

export interface EmissionRow {
  id: number;
  chain_id: string;
  period_id: number;
  scheduled_at: string | null;
  emitted_at: string | null;
  remark_payload: string;
  tip_shannons: string;
  extrinsic_hash: string | null;
  block_hash: string | null;
  block_number: number | null;
  confirmation_depth: number | null;
  confirmed_at: string | null;
  status: 'scheduled' | 'submitted' | 'confirmed' | 'failed' | 'skipped_budget';
}

export interface ListEmissionsQuery {
  status?: EmissionRow['status'];
  periodFrom?: number;
  periodTo?: number;
  limit?: number;
  offset?: number;
}

export const listEmissions = (query: ListEmissionsQuery = {}): EmissionRow[] => {
  const cfg = loadConfig();
  const db = getDb() as Database.Database;

  const where: string[] = ['chain_id = @chain_id'];
  const params: Record<string, unknown> = { chain_id: cfg.CHAIN_ID };

  if (query.status) {
    where.push('status = @status');
    params.status = query.status;
  }
  if (typeof query.periodFrom === 'number') {
    where.push('period_id >= @periodFrom');
    params.periodFrom = query.periodFrom;
  }
  if (typeof query.periodTo === 'number') {
    where.push('period_id <= @periodTo');
    params.periodTo = query.periodTo;
  }

  const limit = Math.min(Math.max(query.limit ?? 50, 1), 500);
  const offset = Math.max(query.offset ?? 0, 0);

  const sql = `
    SELECT id, chain_id, period_id, scheduled_at, emitted_at, remark_payload, tip_shannons,
           extrinsic_hash, block_hash, block_number, confirmation_depth, confirmed_at, status
    FROM emissions
    WHERE ${where.join(' AND ')}
    ORDER BY period_id DESC
    LIMIT @limit OFFSET @offset
  `;
  const stmt = db.prepare(sql);
  return stmt.all({ ...params, limit, offset }) as EmissionRow[];
};

export const getEmissionByPeriod = (periodId: number): EmissionRow | undefined => {
  const cfg = loadConfig();
  const db = getDb() as Database.Database;
  const stmt = db.prepare(
    `SELECT id, chain_id, period_id, scheduled_at, emitted_at, remark_payload, tip_shannons,
            extrinsic_hash, block_hash, block_number, confirmation_depth, confirmed_at, status
     FROM emissions
     WHERE chain_id = @chain_id AND period_id = @period_id`
  );
  const row = stmt.get({ chain_id: cfg.CHAIN_ID, period_id: periodId }) as EmissionRow | undefined;
  return row;
};
