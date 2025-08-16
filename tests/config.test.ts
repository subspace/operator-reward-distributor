import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

describe('config amounts are bigint', () => {
  beforeEach(() => {
    // reset modules so the config module re-parses env
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    process.env.ORD_CHAIN_WS = 'wss://example.com';
    process.env.ORD_CHAIN_ID = 'test';
    process.env.ORD_INTERVAL_SECONDS = '60';
    process.env.ORD_TIP_SHANNONS = '4';
    process.env.ORD_DAILY_CAP_SHANNONS = '10';
    process.env.ORD_MAX_RETRIES = '5';
    process.env.ORD_MORTALITY_BLOCKS = '64';
    process.env.ORD_CONFIRMATIONS = '10';
    process.env.ORD_ACCOUNT_MNEMONIC =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    process.env.ORD_DB_URL = 'sqlite:./:memory:';
    process.env.ORD_MODE = 'A';
    process.env.ORD_PAUSED = 'false';
    process.env.ORD_DRY_RUN = 'true';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('parses ORD_TIP_SHANNONS and ORD_DAILY_CAP_SHANNONS to bigint', async () => {
    const { loadConfig } = await import('../src/config.js');
    const cfg = loadConfig();
    expect(typeof cfg.ORD_TIP_SHANNONS).toBe('bigint');
    expect(typeof cfg.ORD_DAILY_CAP_SHANNONS).toBe('bigint');
    expect(cfg.ORD_TIP_SHANNONS).toBe(4n);
    expect(cfg.ORD_DAILY_CAP_SHANNONS).toBe(10n);
  });

  it('rejects invalid amount strings', async () => {
    process.env.ORD_TIP_SHANNONS = '0';
    const { loadConfig } = await import('../src/config.js');
    expect(() => loadConfig()).toThrow(/Invalid configuration/);
  });
});
