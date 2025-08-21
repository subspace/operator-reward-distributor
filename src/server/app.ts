import Fastify from 'fastify';

import { checkBudget } from '../budget/rules.js';
import { getApi } from '../chain/api.js';
import { getChainInfo } from '../chain/info.js';
import { loadConfig } from '../config.js';
import { getEmissionByPeriod, listEmissions } from '../db/queries.js';
import { logger as pinoLogger } from '../logger.js';
import { computePeriodId, getOnChainTimestampMs } from '../scheduler/period.js';
import { formatShannonsToAi3 } from '../utils/amounts.js';

const buildApp = () => Fastify({ logger: true });

const probeScheduler = async (): Promise<boolean> => {
  const cfg = loadConfig();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500);
    const res = await fetch(cfg.SCHEDULER_HEALTH_URL, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
};

const toInt = (s: string | null, opts: { min?: number; max?: number } = {}): number | undefined => {
  if (!s || !/^\d+$/u.test(s)) return undefined;
  let n = Number(s);
  if (typeof opts.min === 'number' && n < opts.min) n = opts.min;
  if (typeof opts.max === 'number' && n > opts.max) n = opts.max;
  return n;
};

export const start = async () => {
  const app = buildApp();

  app.get('/health', async () => {
    const cfg = loadConfig();
    let head: number | null = null;
    let chainOk = false;
    let currentPeriod: number | null = null;
    const schedulerRunning = await probeScheduler();
    try {
      const api = await getApi();
      const header = await api.rpc.chain.getHeader();
      head = header.number.toNumber();
      const tsMs = await getOnChainTimestampMs(api);
      currentPeriod = computePeriodId(tsMs, cfg.INTERVAL_SECONDS);
      chainOk = true;
    } catch {
      chainOk = false;
    }
    return {
      ok: true,
      data: {
        service: { version: '0.1.0', uptimeSec: Math.floor(process.uptime()) },
        db: { ok: true },
        chain: { connected: chainOk, head },
        scheduler: { running: schedulerRunning, currentPeriod },
      },
    };
  });

  app.get('/info', async () => {
    const api = await getApi();
    const info = await getChainInfo(api);
    const cfg = loadConfig();
    return {
      ok: true,
      data: {
        chain: info.chain,
        node: `${info.nodeName} ${info.nodeVersion}`,
        token: { symbol: info.tokenSymbol, decimals: info.tokenDecimals },
        rpcEndpoints: cfg.rpcEndpoints.length,
      },
    };
  });

  app.get('/config', async () => {
    const cfg = loadConfig();
    return {
      ok: true,
      data: {
        chainId: cfg.CHAIN_ID,
        intervalSeconds: cfg.INTERVAL_SECONDS,
        tipShannons: cfg.TIP_SHANNONS.toString(),
        dailyCapShannons: cfg.DAILY_CAP_SHANNONS.toString(),
        confirmations: cfg.CONFIRMATIONS,
        mortalityBlocks: cfg.MORTALITY_BLOCKS,
        maxRetries: cfg.MAX_RETRIES,
        rpcEndpoints: cfg.rpcEndpoints,
      },
    };
  });

  app.get('/scheduler', async () => {
    const cfg = loadConfig();
    let currentPeriod: number | null = null;
    const running = await probeScheduler();
    try {
      const api = await getApi();
      const tsMs = await getOnChainTimestampMs(api);
      currentPeriod = computePeriodId(tsMs, cfg.INTERVAL_SECONDS);
    } catch {
      // ignore chain errors
    }
    return {
      ok: true,
      data: {
        running,
        currentPeriod,
        intervalSeconds: cfg.INTERVAL_SECONDS,
      },
    };
  });

  app.get('/emissions', async (request) => {
    const url = new URL(request.url, 'http://localhost');

    const allowedStatuses = new Set([
      'scheduled',
      'submitted',
      'confirmed',
      'failed',
      'skipped_budget',
    ] as const);
    const allowedOrderBy = new Set([
      'period_id_asc',
      'period_id_desc',
      'emitted_at_asc',
      'emitted_at_desc',
      'scheduled_at_asc',
      'scheduled_at_desc',
    ] as const);

    const statusRaw = url.searchParams.get('status');
    const status = allowedStatuses.has(statusRaw as any)
      ? (statusRaw as 'scheduled' | 'submitted' | 'confirmed' | 'failed' | 'skipped_budget')
      : undefined;

    const periodFrom = toInt(url.searchParams.get('periodFrom'), { min: 0 });
    const periodTo = toInt(url.searchParams.get('periodTo'), { min: 0 });
    const limit = toInt(url.searchParams.get('limit'), { min: 1, max: 500 });
    const offset = toInt(url.searchParams.get('offset'), { min: 0 });

    const orderByRaw = url.searchParams.get('order_by');
    const orderBy = allowedOrderBy.has(orderByRaw as any)
      ? (orderByRaw as
          | 'period_id_asc'
          | 'period_id_desc'
          | 'emitted_at_asc'
          | 'emitted_at_desc'
          | 'scheduled_at_asc'
          | 'scheduled_at_desc')
      : undefined;

    const rows = listEmissions({ status, periodFrom, periodTo, limit, offset, orderBy });
    const mapped = rows.map((r) => ({
      ...r,
      tip_ai3: formatShannonsToAi3(r.tip_shannons),
    }));
    return { ok: true, data: mapped };
  });

  app.get('/emissions/:periodId', async (request, reply) => {
    const { periodId } = request.params as { periodId: string };
    const id = toInt(periodId, { min: 0 });
    if (id === undefined) {
      reply.code(400);
      return {
        ok: false,
        error: { code: 'bad_request', message: 'periodId must be a non-negative integer' },
      };
    }
    const row = getEmissionByPeriod(id);
    if (!row) {
      reply.code(404);
      return { ok: false, error: { code: 'not_found', message: 'emission not found' } };
    }
    return { ok: true, data: { ...row, tip_ai3: formatShannonsToAi3(row.tip_shannons) } };
  });

  app.get('/budget', async () => {
    const cfg = loadConfig();
    const budget = checkBudget();
    const spentShannons = (budget.spentToday ?? 0n).toString();
    const tipShannons = cfg.TIP_SHANNONS.toString();
    const capShannons = cfg.DAILY_CAP_SHANNONS.toString();
    const spentBig = BigInt(spentShannons);
    const capBig = BigInt(capShannons);
    const remainingBig = capBig > spentBig ? capBig - spentBig : 0n;
    const now = new Date();
    const endUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
    );
    const secondsUntilReset = Math.max(0, Math.floor((endUtc.getTime() - now.getTime()) / 1000));
    return {
      ok: true,
      data: {
        ok: budget.ok,
        reason: budget.reason ?? null,
        spentTodayShannons: spentShannons,
        spentTodayAi3: formatShannonsToAi3(spentShannons),
        tipShannons,
        tipAi3: formatShannonsToAi3(tipShannons),
        dailyCapShannons: capShannons,
        dailyCapAi3: formatShannonsToAi3(capShannons),
        remainingShannons: remainingBig.toString(),
        remainingAi3: formatShannonsToAi3(remainingBig.toString()),
        secondsUntilReset,
      },
    };
  });

  const port = loadConfig().SERVER_PORT;
  await app.listen({ port, host: '0.0.0.0' });
};

// Start when invoked via yarn serve
start().catch((err) => {
  pinoLogger.error({ err }, 'server failed to start');
  process.exit(1);
});
