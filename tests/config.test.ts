import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

describe('config amounts are bigint', () => {
  beforeEach(() => {
    // reset modules so the config module re-parses env
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    process.env.CHAIN_WS = 'wss://example.com';
    process.env.CHAIN_ID = 'test';
    process.env.INTERVAL_SECONDS = '60';
    process.env.TIP_AI3 = '0.000000000000000004';
    process.env.DAILY_CAP_AI3 = '0.000000000000000010';
    process.env.MAX_RETRIES = '5';
    process.env.MORTALITY_BLOCKS = '64';
    process.env.CONFIRMATIONS = '10';
    process.env.ACCOUNT_PRIVATE_KEY =
      '0x1111111111111111111111111111111111111111111111111111111111111111';
    process.env.DB_URL = 'sqlite:./:memory:';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('parses TIP_AI3 and DAILY_CAP_AI3 to bigint (shannons)', async () => {
    const { loadConfig } = await import('../src/config.js');
    const cfg = loadConfig();
    expect(typeof cfg.TIP_SHANNONS).toBe('bigint');
    expect(typeof cfg.DAILY_CAP_SHANNONS).toBe('bigint');
    expect(cfg.TIP_SHANNONS).toBe(4n);
    expect(cfg.DAILY_CAP_SHANNONS).toBe(10n);
  });

  it('rejects invalid amount strings', async () => {
    process.env.TIP_AI3 = '0';
    const { loadConfig } = await import('../src/config.js');
    expect(() => loadConfig()).toThrow(/Invalid configuration/);
  });
});
