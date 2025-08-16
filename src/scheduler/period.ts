import type { ApiPromise } from '@polkadot/api';

export const computePeriodId = (onChainTimestampMs: number, intervalSeconds: number): number =>
  Math.floor(onChainTimestampMs / (intervalSeconds * 1000));

export const getOnChainTimestampMs = async (api: ApiPromise): Promise<number> => {
  const now = await api.query.timestamp.now();
  return Number(now.toString());
};
