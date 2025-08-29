import { getApi } from '../chain/api.js';
import { loadConfig } from '../config.js';

const getChainInfo = async () => {
  try {
    const api = await getApi();
    const header = await api.rpc.chain.getHeader();
    return { chainOk: true, head: header.number.toNumber() };
  } catch {
    return { chainOk: false, head: null };
  }
};

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
  const schedulerRunning = await probeScheduler();
  const chain = await getChainInfo();

  return {
    ok: schedulerRunning && chain.chainOk,
    data: {
      service: { uptimeSec: Math.floor(process.uptime()) },
      chain,
      scheduler: { running: schedulerRunning },
    },
  };
};
