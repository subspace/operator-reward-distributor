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
  orderBy?:
    | 'period_id_asc'
    | 'period_id_desc'
    | 'emitted_at_asc'
    | 'emitted_at_desc'
    | 'scheduled_at_asc'
    | 'scheduled_at_desc';
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
  if (
    typeof query.periodFrom === 'number' &&
    Number.isFinite(query.periodFrom) &&
    Number.isInteger(query.periodFrom)
  ) {
    where.push('period_id >= @periodFrom');
    params.periodFrom = query.periodFrom;
  }
  if (
    typeof query.periodTo === 'number' &&
    Number.isFinite(query.periodTo) &&
    Number.isInteger(query.periodTo)
  ) {
    where.push('period_id <= @periodTo');
    params.periodTo = query.periodTo;
  }

  const limitRaw =
    typeof query.limit === 'number' && Number.isFinite(query.limit) && Number.isInteger(query.limit)
      ? query.limit
      : undefined;
  const offsetRaw =
    typeof query.offset === 'number' &&
    Number.isFinite(query.offset) &&
    Number.isInteger(query.offset)
      ? query.offset
      : undefined;

  const limit = Math.min(Math.max(limitRaw ?? 50, 1), 500);
  const offset = Math.max(offsetRaw ?? 0, 0);

  const orderBy = (() => {
    switch (query.orderBy) {
      case 'period_id_asc':
        return 'period_id ASC';
      case 'period_id_desc':
        return 'period_id DESC';
      case 'emitted_at_asc':
        return 'emitted_at ASC, period_id ASC';
      case 'emitted_at_desc':
        return 'emitted_at DESC, period_id DESC';
      case 'scheduled_at_asc':
        return 'scheduled_at ASC, period_id ASC';
      case 'scheduled_at_desc':
        return 'scheduled_at DESC, period_id DESC';
      default:
        return 'period_id DESC';
    }
  })();

  const sql = `
    SELECT id, chain_id, period_id, scheduled_at, emitted_at, remark_payload, tip_shannons,
           extrinsic_hash, block_hash, block_number, confirmation_depth, confirmed_at, status
    FROM emissions
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderBy}
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
