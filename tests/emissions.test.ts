import { beforeEach, describe, expect, it, vi } from 'vitest';

import { reserveEmissionIfNeeded, updateSubmitted } from '../src/db/emissions.js';

// Mock config to isolate DB keying and amounts
vi.mock('../src/config.js', () => ({
  loadConfig: () => ({ ORD_CHAIN_ID: 'test-chain', ORD_TIP_SHANNONS: 1_000_000_000_000_000_000n }),
}));

// Use a temporary sqlite file per test process
vi.mock('../src/db/connection.js', async (orig) => {
  (await (orig as any).default?.()) ?? {}; // not used
  const Database = (await import('better-sqlite3')).default;
  let db: any;
  return {
    getDb: () => {
      if (!db) {
        db = new Database(':memory:');
        db.pragma('journal_mode = WAL');
        db.exec(`CREATE TABLE emissions (
          id INTEGER PRIMARY KEY,
          chain_id TEXT NOT NULL,
          period_id INTEGER NOT NULL,
          scheduled_at TEXT,
          emitted_at TEXT,
          remark_payload TEXT NOT NULL,
          tip_shannons TEXT NOT NULL,
          extrinsic_hash TEXT,
          block_hash TEXT,
          block_number INTEGER,
          block_author TEXT,
          confirmation_depth INTEGER,
          confirmed_at TEXT,
          status TEXT NOT NULL,
          UNIQUE(chain_id, period_id)
        );`);
      }
      return db;
    },
  };
});

describe('emissions DAO', () => {
  beforeEach(() => {
    // no-op; each test uses same in-memory db lifecycle for simplicity
  });

  it('reserves once per period (idempotent)', () => {
    expect(reserveEmissionIfNeeded(42)).toBe(true);
    expect(reserveEmissionIfNeeded(42)).toBe(false);
    expect(reserveEmissionIfNeeded(43)).toBe(true);
  });

  it('updateSubmitted updates status and fields', async () => {
    reserveEmissionIfNeeded(99);
    updateSubmitted(99, { extrinsic_hash: '0xabc', remark_payload: '{"ok":true}' });
    // read back
    const { getDb } = await import('../src/db/connection.js');
    const row = (getDb() as any)
      .prepare('SELECT status, extrinsic_hash, remark_payload FROM emissions WHERE period_id=?')
      .get(99);
    expect(row.status).toBe('submitted');
    expect(row.extrinsic_hash).toBe('0xabc');
    expect(row.remark_payload).toBe('{"ok":true}');
  });
});
