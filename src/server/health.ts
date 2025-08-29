import { getApi } from '../chain/api.js';
import { loadConfig } from '../config.js';
import { getLastEmission } from '../db/queries.js';

const getChainInfo = async () => {
  try {
    const api = await getApi();
    const header = await api.rpc.chain.getHeader();
    return { chainOk: true, head: header.number.toNumber() };
  } catch {
    return { chainOk: false, head: null };
  }
};

const getLastEmissionInfo = () => {
  const { INTERVAL_SECONDS } = loadConfig();
  const LATE_THRESHOLD_FACTOR = 0.5;
  const lastEmission = getLastEmission();
  const nextExpectedAt = lastEmission?.emitted_at
    ? new Date(lastEmission.emitted_at).getTime() + INTERVAL_SECONDS * 1000
    : null;
  const emissionIsLate =
    nextExpectedAt && Date.now() > nextExpectedAt + INTERVAL_SECONDS * 1000 * LATE_THRESHOLD_FACTOR;
  const emissionInfo = lastEmission
    ? {
        lastEmittedAt: lastEmission.emitted_at,
        lastExtrinsicHash: lastEmission.extrinsic_hash,
        lastBlockHash: lastEmission.block_hash,
        lastBlockNumber: lastEmission.block_number,
        nextExpectedAt: nextExpectedAt ? new Date(nextExpectedAt).toISOString() : null,
        isLate: emissionIsLate,
      }
    : null;
  return emissionInfo;
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
  const emissionInfo = getLastEmissionInfo();

  return {
    ok: schedulerRunning && chain.chainOk && !emissionInfo?.isLate,
    data: {
      service: { uptimeSec: Math.floor(process.uptime()) },
      chain,
      scheduler: { running: schedulerRunning },
      emissionInfo,
    },
  };
};
