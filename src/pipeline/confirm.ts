import { getApi } from '../chain/api.js';
import { getBlockAuthor } from '../chain/author.js';
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
    const unsubPromise = api.rpc.chain.subscribeNewHeads(async (lastHeader) => {
      try {
        const depth = lastHeader.number.toNumber() - inclusionNumber;
        if (depth >= cfg.ORD_CONFIRMATIONS) {
          const author = await getBlockAuthor(api, inclusionHash);
          updateConfirmed(periodId, {
            confirmation_depth: depth,
            block_author: author,
          });
          (await unsubPromise)();
          resolve();
        }
      } catch (e) {
        (await unsubPromise)();
        reject(e);
      }
    });
  });
};
