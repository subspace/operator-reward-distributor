import { getApi } from '../chain/api.js';
import { loadConfig } from '../config.js';
import { getLastEmission } from '../db/queries.js';
import { formatShannonsToAi3 } from '../utils/amounts.js';
import { getSigner } from '../wallet/signer.js';

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
  return { emissionsOk: !emissionIsLate, ...emissionInfo };
};

const getWalletInfo = async () => {
  const cfg = loadConfig();
  const LOW_BALANCE_DAYS_THRESHOLD = 3;

  try {
    const api = await getApi();
    const signer = getSigner();

    // Query account balance
    const accountInfo = await api.query.system.account(signer.address);
    const balance = (accountInfo as any).data.free.toBigInt();

    // Calculate daily emission cost
    // Each emission costs TIP_SHANNONS, and we have INTERVAL_SECONDS between emissions
    // So daily cost = TIP_SHANNONS * (24 * 60 * 60 / INTERVAL_SECONDS)
    const emissionsPerDay = (24 * 60 * 60) / cfg.INTERVAL_SECONDS;

    const dailyCost = cfg.TIP_SHANNONS * BigInt(Math.floor(emissionsPerDay));

    // Calculate days remaining
    const daysRemaining = dailyCost > 0n ? Number(balance / dailyCost) : 999;
    const isLowBalance = daysRemaining < LOW_BALANCE_DAYS_THRESHOLD;

    return {
      walletOk: !isLowBalance,
      address: signer.address,
      balanceAi3: formatShannonsToAi3(balance),
      dailyCostAi3: formatShannonsToAi3(dailyCost),
      daysRemaining,
      isLowBalance,
    };
  } catch (error) {
    return {
      walletOk: false,
      error: error instanceof Error ? error.message : 'Unknown wallet error',
    };
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
  const emissionInfo = getLastEmissionInfo();
  const walletInfo = await getWalletInfo();

  return {
    ok: schedulerRunning && chain.chainOk && emissionInfo.emissionsOk && walletInfo.walletOk,
    data: {
      service: { uptimeSec: Math.floor(process.uptime()) },
      chain,
      scheduler: { running: schedulerRunning },
      emissionInfo,
      walletInfo,
    },
  };
};
