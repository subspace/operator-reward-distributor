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
  const port = cfg.SCHEDULER_PORT;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500);
    const res = await fetch(`http://127.0.0.1:${port}/`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
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
    const status = url.searchParams.get('status') as
      | 'scheduled'
      | 'submitted'
      | 'confirmed'
      | 'failed'
      | 'skipped_budget'
      | null;
    const periodFrom = url.searchParams.get('periodFrom');
    const periodTo = url.searchParams.get('periodTo');
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');
    const orderBy = url.searchParams.get('order_by') as
      | 'period_id_asc'
      | 'period_id_desc'
      | 'emitted_at_asc'
      | 'emitted_at_desc'
      | 'scheduled_at_asc'
      | 'scheduled_at_desc'
      | null;
    const rows = listEmissions({
      status: status ?? undefined,
      periodFrom: periodFrom ? Number(periodFrom) : undefined,
      periodTo: periodTo ? Number(periodTo) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      orderBy: orderBy ?? undefined,
    });
    const mapped = rows.map((r) => ({
      ...r,
      tip_ai3: formatShannonsToAi3(r.tip_shannons),
    }));
    return { ok: true, data: mapped };
  });

  app.get('/emissions/:periodId', async (request, reply) => {
    const { periodId } = request.params as { periodId: string };
    const row = getEmissionByPeriod(Number(periodId));
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
