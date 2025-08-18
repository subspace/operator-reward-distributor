import Fastify from 'fastify';

import { getApi } from '../chain/api.js';
import { getChainInfo } from '../chain/info.js';
import { loadConfig } from '../config.js';
import { logger as pinoLogger } from '../logger.js';
import { computePeriodId, getOnChainTimestampMs } from '../scheduler/period.js';

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
        dryRun: cfg.DRY_RUN,
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

  const port = loadConfig().SERVER_PORT;
  await app.listen({ port, host: '0.0.0.0' });
};

// Start when invoked via yarn serve
start().catch((err) => {
  pinoLogger.error({ err }, 'server failed to start');
  process.exit(1);
});
