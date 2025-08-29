import { getApi } from '../chain/api.js';
import { loadConfig } from '../config.js';
import { computePeriodId } from '../scheduler/period.js';
import { getOnChainTimestampMs } from '../scheduler/period.js';

export const probeScheduler = async (): Promise<boolean> => {
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

export const getHealthSnapshot = async () => {
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
    ok: schedulerRunning && chainOk,
    data: {
      service: { uptimeSec: Math.floor(process.uptime()) },
      chain: { connected: chainOk, head },
      scheduler: { running: schedulerRunning, currentPeriod },
    },
  };
};
