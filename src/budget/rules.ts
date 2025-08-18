import { loadConfig } from '../config.js';
import { getSpentShannonsSince } from '../db/emissions.js';

const startOfUtcDay = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));

export interface BudgetCheck {
  ok: boolean;
  reason?: 'over_daily_cap';
  spentToday?: bigint;
}

export const checkBudget = (): BudgetCheck => {
  const cfg = loadConfig();

  const since = startOfUtcDay(new Date()).toISOString();
  const spentToday = getSpentShannonsSince(cfg.CHAIN_ID, since);
  const cap = cfg.DAILY_CAP_SHANNONS;
  if (spentToday + cfg.TIP_SHANNONS > cap) {
    return { ok: false, reason: 'over_daily_cap', spentToday };
  }
  return { ok: true, spentToday };
};
