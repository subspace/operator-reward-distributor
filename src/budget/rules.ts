import { loadConfig } from '../config.js';
import { getDb } from '../db/connection.js';

const startOfUtcDay = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));

export interface BudgetCheck {
  ok: boolean;
  reason?: 'paused' | 'over_daily_cap';
  spentToday?: bigint;
}

export const checkBudget = (): BudgetCheck => {
  const cfg = loadConfig();
  if (cfg.PAUSED) return { ok: false, reason: 'paused' };

  const db = getDb();
  const since = startOfUtcDay(new Date()).toISOString();

  const row = (db as any)
    .prepare(
      `SELECT COALESCE(SUM(CAST(tip_shannons AS INTEGER)), 0) AS spent
       FROM emissions
       WHERE chain_id = ?
         AND status IN ('submitted','confirmed')
         AND scheduled_at >= ?`
    )
    .get(cfg.CHAIN_ID, since) as { spent: number };

  const spentToday = BigInt(row.spent);
  const cap = cfg.DAILY_CAP_SHANNONS;
  if (spentToday + cfg.TIP_SHANNONS > cap) {
    return { ok: false, reason: 'over_daily_cap', spentToday };
  }
  return { ok: true, spentToday };
};
