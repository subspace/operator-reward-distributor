import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getHealthSnapshot, probeScheduler } from '../src/server/health.js';

// Mock config
vi.mock('../src/config.js', () => ({
  loadConfig: () => ({
    CHAIN_ID: 'test-chain',
    INTERVAL_SECONDS: 180,
    SCHEDULER_HEALTH_URL: 'http://localhost:3000/health',
    TIP_SHANNONS: 1_000_000_000_000_000_000n,
  }),
}));

// Mock chain API
vi.mock('../src/chain/api.js', () => ({
  getApi: vi.fn(),
}));

// Mock wallet signer
vi.mock('../src/wallet/signer.js', () => ({
  getSigner: vi.fn(),
}));

// Mock database connection and queries
vi.mock('../src/db/connection.js', async (orig) => {
  (await (orig as any).default?.()) ?? {};
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

// Helper to insert test emission data
const insertEmission = async (data: {
  period_id: number;
  emitted_at?: string;
  extrinsic_hash?: string;
  block_hash?: string;
  block_number?: number;
  status?: string;
}) => {
  const { getDb } = await import('../src/db/connection.js');
  const db = getDb() as any;
  db.prepare(
    `INSERT INTO emissions (
      chain_id, period_id, scheduled_at, emitted_at, remark_payload, 
      tip_shannons, extrinsic_hash, block_hash, block_number, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    'test-chain',
    data.period_id,
    '2025-08-29T19:20:00.000Z',
    data.emitted_at || null,
    '{"test": true}',
    '1000000000000000000',
    data.extrinsic_hash || null,
    data.block_hash || null,
    data.block_number || null,
    data.status || 'scheduled'
  );
};

// Helper to mock wallet balance
const mockWalletBalance = async (balanceShannons: bigint) => {
  const { getSigner } = await import('../src/wallet/signer.js');
  vi.mocked(getSigner).mockReturnValue({
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    addressRaw: new Uint8Array(),
    meta: {},
    isLocked: false,
    publicKey: new Uint8Array(),
    type: 'ethereum',
  } as any);

  return {
    query: {
      system: {
        account: vi.fn().mockResolvedValue({
          data: {
            free: {
              toBigInt: () => balanceShannons,
            },
          },
        }),
      },
    },
  };
};

// Shared test helpers
const mockSuccessfulChain = async (blockNumber = 12345) => {
  const { getApi } = await import('../src/chain/api.js');
  vi.mocked(getApi).mockResolvedValue({
    rpc: {
      chain: {
        getHeader: () => ({
          number: { toNumber: () => blockNumber },
        }),
      },
    },
  } as any);
};

const mockSuccessfulWallet = async (daysWorth = 10) => {
  const dailyCost = 1_000_000_000_000_000_000n * BigInt(Math.floor((24 * 60 * 60) / 180));
  const balance = (dailyCost * BigInt(Math.floor(daysWorth * 1000))) / 1000n; // Handle decimal days

  const { getApi } = await import('../src/chain/api.js');
  const currentMock = vi.mocked(getApi).getMockImplementation();

  vi.mocked(getApi).mockResolvedValue({
    ...(currentMock ? await currentMock() : {}),
    ...(await mockWalletBalance(balance)),
  } as any);
};

const mockFailedChain = async () => {
  const { getApi } = await import('../src/chain/api.js');
  vi.mocked(getApi).mockRejectedValue(new Error('Chain connection failed'));
};

describe('health endpoint', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Clear database
    const { getDb } = await import('../src/db/connection.js');
    const db = getDb();
    db.exec('DELETE FROM emissions');

    // Default successful scheduler
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  describe('probeScheduler', () => {
    it('returns true when scheduler responds with ok status', async () => {
      // Mock successful fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
      });

      const result = await probeScheduler();
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/health', {
        signal: expect.any(AbortSignal),
      });
    });

    it('returns false when scheduler responds with error status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      const result = await probeScheduler();
      expect(result).toBe(false);
    });

    it('returns false when fetch throws error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await probeScheduler();
      expect(result).toBe(false);
    });

    it('returns false when request times out', async () => {
      // Mock fetch that takes longer than the 500ms timeout
      global.fetch = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));

      const result = await probeScheduler();
      expect(result).toBe(false);
    }, 2000); // Set test timeout to 2 seconds
  });

  describe('getHealthSnapshot', () => {
    it('returns healthy status when all systems are ok', async () => {
      await mockSuccessfulChain();
      await mockSuccessfulWallet();

      // Insert recent emission (not late)
      const recentTime = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute ago
      await insertEmission({
        period_id: 100,
        emitted_at: recentTime,
        extrinsic_hash: '0x123abc',
        block_hash: '0x456def',
        block_number: 12340,
        status: 'confirmed',
      });

      const result = await getHealthSnapshot();

      expect(result.ok).toBe(true);
      expect(result.data.service.uptimeSec).toBeGreaterThan(0);
      expect(result.data.chain.chainOk).toBe(true);
      expect(result.data.chain.head).toBe(12345);
      expect(result.data.scheduler.running).toBe(true);
      expect(result.data.emissionInfo).toMatchObject({
        lastEmittedAt: recentTime,
        lastExtrinsicHash: '0x123abc',
        lastBlockHash: '0x456def',
        lastBlockNumber: 12340,
        isLate: false,
      });
      expect(result.data.emissionInfo?.nextExpectedAt).toBeTruthy();
      expect(result.data.walletInfo.walletOk).toBe(true);
      expect(result.data.walletInfo.daysRemaining).toBeGreaterThan(3);
      expect(result.data.walletInfo.isLowBalance).toBe(false);
      expect(result.data.walletInfo.balanceAi3).toBeTruthy();
      expect(result.data.walletInfo.dailyCostAi3).toBeTruthy();
    });

    it('returns unhealthy when scheduler is down', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });
      await mockSuccessfulChain();
      await mockSuccessfulWallet();

      const result = await getHealthSnapshot();

      expect(result.ok).toBe(false);
      expect(result.data.scheduler.running).toBe(false);
    });

    it('returns unhealthy when chain is down', async () => {
      await mockFailedChain();

      const result = await getHealthSnapshot();

      expect(result.ok).toBe(false);
      expect(result.data.chain.chainOk).toBe(false);
      expect(result.data.chain.head).toBe(null);
    });

    it('returns unhealthy when emissions are late', async () => {
      await mockSuccessfulChain();
      await mockSuccessfulWallet();

      // Insert old emission (should be late)
      // Late threshold calculation: nextExpectedAt + (INTERVAL_SECONDS * 1000 * LATE_THRESHOLD_FACTOR)
      // nextExpectedAt = emitted_at + 180 seconds
      // late threshold = nextExpectedAt + (180 * 1000 * 0.5) = nextExpectedAt + 90 seconds
      // So total time for late = emitted_at + 180 + 90 = emitted_at + 270 seconds
      // Make emission 5 minutes old (300 seconds) to ensure it's late
      const oldTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      await insertEmission({
        period_id: 100,
        emitted_at: oldTime,
        status: 'confirmed',
      });

      const result = await getHealthSnapshot();

      expect(result.ok).toBe(false);
      expect(result.data.emissionInfo.emissionsOk).toBe(false);
    });

    it('handles no emissions gracefully', async () => {
      await mockSuccessfulChain();
      await mockSuccessfulWallet();

      const result = await getHealthSnapshot();

      expect(result.ok).toBe(true); // No emissions is not considered unhealthy
      expect(result.data.emissionInfo.emissionsOk).toBe(true);
    });

    it('calculates nextExpectedAt correctly', async () => {
      await mockSuccessfulChain();
      await mockSuccessfulWallet();

      const baseTime = new Date('2025-08-29T19:23:26.000Z');
      await insertEmission({
        period_id: 100,
        emitted_at: baseTime.toISOString(),
        status: 'confirmed',
      });

      const result = await getHealthSnapshot();

      // Should be 180 seconds (3 minutes) after base time
      const expectedTime = new Date(baseTime.getTime() + 180 * 1000).toISOString();
      expect(result.data.emissionInfo?.nextExpectedAt).toBe(expectedTime);
    });

    it('determines late status correctly', async () => {
      await mockSuccessfulChain();
      await mockSuccessfulWallet();

      // Emission from 4 minutes ago (240 seconds)
      // Late threshold = 180 + (180 * 0.5) = 180 + 90 = 270 seconds
      // So 240 seconds should NOT be late
      const notLateTime = new Date(Date.now() - 4 * 60 * 1000).toISOString();
      await insertEmission({
        period_id: 100,
        emitted_at: notLateTime,
        status: 'confirmed',
      });

      const result = await getHealthSnapshot();
      expect(result.data.emissionInfo.emissionsOk).toBe(true);

      // Clear and test with actually late emission
      const { getDb } = await import('../src/db/connection.js');
      getDb().exec('DELETE FROM emissions');

      // Emission from 5 minutes ago (300 seconds) - should be late (> 270 seconds)
      const lateTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      await insertEmission({
        period_id: 101,
        emitted_at: lateTime,
        status: 'confirmed',
      });

      const lateResult = await getHealthSnapshot();
      expect(lateResult.data.emissionInfo.emissionsOk).toBe(false);
      expect(lateResult.ok).toBe(false);
    });

    it('includes service uptime', async () => {
      await mockSuccessfulChain();
      await mockSuccessfulWallet();

      const result = await getHealthSnapshot();

      expect(result.data.service.uptimeSec).toBeTypeOf('number');
      expect(result.data.service.uptimeSec).toBeGreaterThanOrEqual(0);
    });

    it('returns unhealthy when wallet balance is low', async () => {
      await mockSuccessfulChain();
      await mockSuccessfulWallet(2.5); // 2.5 days worth (less than 3 day threshold)

      const result = await getHealthSnapshot();

      expect(result.ok).toBe(false);
      expect(result.data.walletInfo.walletOk).toBe(false);
      expect(result.data.walletInfo.isLowBalance).toBe(true);
      expect(result.data.walletInfo.daysRemaining).toBeLessThan(3);
      expect(result.data.walletInfo.address).toBe(
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
      );
    });

    it('returns unhealthy when wallet query fails', async () => {
      await mockSuccessfulChain();

      // Mock wallet query failure
      const { getApi } = await import('../src/chain/api.js');
      const currentMock = vi.mocked(getApi).getMockImplementation();
      vi.mocked(getApi).mockResolvedValue({
        ...(currentMock ? await currentMock() : {}),
        query: {
          system: {
            account: vi.fn().mockRejectedValue(new Error('Account query failed')),
          },
        },
      } as any);

      const result = await getHealthSnapshot();

      expect(result.ok).toBe(false);
      expect(result.data.walletInfo.walletOk).toBe(false);
      expect(result.data.walletInfo.error).toBe('Account query failed');
    });

    it('calculates wallet days remaining correctly', async () => {
      await mockSuccessfulChain();
      await mockSuccessfulWallet(3); // Exactly 3 days worth

      const result = await getHealthSnapshot();

      expect(result.data.walletInfo.daysRemaining).toBe(3.0);
      expect(result.data.walletInfo.walletOk).toBe(true); // 3 days >= 3 day threshold
      expect(result.data.walletInfo.balanceAi3).toBeTruthy();
      expect(result.data.walletInfo.dailyCostAi3).toBeTruthy();
      // Verify AI3 values are properly formatted (should be numeric strings)
      expect(parseFloat(result.data.walletInfo.balanceAi3!)).toBeGreaterThan(0);
      expect(parseFloat(result.data.walletInfo.dailyCostAi3!)).toBeGreaterThan(0);
    });
  });
});
