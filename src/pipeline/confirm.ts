import { getApi } from '../chain/api.js';
import { loadConfig } from '../config.js';
import { updateConfirmed, updateInclusion } from '../db/emissions.js';

export const trackConfirmation = async (
  periodId: number,
  inclusionHash: string,
  inclusionNumber: number
): Promise<void> => {
  const cfg = loadConfig();
  const api = await getApi();

  updateInclusion(periodId, {
    block_hash: inclusionHash,
    block_number: inclusionNumber,
  });

  return new Promise<void>((resolve, reject) => {
    let unsubscribe: (() => void) | null = null;
    api.rpc.chain
      .subscribeNewHeads(async (lastHeader) => {
        try {
          const depth = lastHeader.number.toNumber() - inclusionNumber;
          if (depth >= cfg.CONFIRMATIONS) {
            updateConfirmed(periodId, {
              confirmation_depth: depth,
            });
            if (unsubscribe) unsubscribe();
            resolve();
          }
        } catch (e) {
          if (unsubscribe) unsubscribe();
          reject(e);
        }
      })
      .then((unsub) => {
        unsubscribe = unsub;
      })
      .catch((e) => {
        if (unsubscribe) unsubscribe();
        reject(e);
      });
  });
};
