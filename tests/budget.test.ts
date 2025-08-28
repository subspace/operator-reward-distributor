import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../src/db/connection.js', () => {
  // simple in-memory mock with programmable sum compatible with .get() and .all()
  let spent = 0n;
  return {
    getDb: () => ({
      prepare: () => ({
        get: () => ({ spent: Number(spent) }),
        all: () => [{ tip_shannons: String(spent) }],
      }),
      __setSpent: (v: bigint) => {
        spent = v;
      },
    }),
  };
});

describe('budget rules', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('allows under cap and blocks over cap', async () => {
    vi.doMock('../src/config.js', () => ({
      loadConfig: () => ({
        CHAIN_ID: 'test',
        TIP_SHANNONS: 4n,
        DAILY_CAP_SHANNONS: 10n,
        PAUSED: false,
      }),
    }));
    const { checkBudget: cb } = await import('../src/budget/rules.js');
    let r = cb();
    expect(r.ok).toBe(true);

    // simulate spent today = 7n -> 7 + 4 > 10 => blocked
    // @ts-expect-error test hook
    (await import('../src/db/connection.js')).getDb().__setSpent(7n);
    r = cb();
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('over_daily_cap');
  });
});
