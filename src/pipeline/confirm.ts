import { getApi } from '../chain/api.js';
import { loadConfig } from '../config.js';
import { updateConfirmed, updateInclusion } from '../db/emissions.js';
import { logger } from '../logger.js';

export const trackConfirmation = async (
  periodId: number,
  inclusionHash: string,
  inclusionNumber: number
): Promise<void> => {
  const cfg = loadConfig();

  updateInclusion(periodId, {
    block_hash: inclusionHash,
    block_number: inclusionNumber,
  });

  const target = inclusionNumber + cfg.CONFIRMATIONS;

  // Poll best head until target reached
  // Simple and robust; avoids keeping a long-lived subscription
  // Sleep helper
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // wait loop
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const api = await getApi();
      const head = await api.rpc.chain.getHeader();
      const best = head.number.toNumber();
      if (best >= target) {
        break;
      }
    } catch (err) {
      logger.warn({ err, periodId, inclusionNumber }, 'confirmation polling error; retrying');
    }
    await sleep(6000);
  }

  // Verify canonical hash at inclusionNumber still matches
  try {
    const api = await getApi();
    const canonicalAtInclusion = (await api.rpc.chain.getBlockHash(inclusionNumber)).toHex();
    if (canonicalAtInclusion !== inclusionHash) {
      // Reorg happened before depth; leave as submitted and return
      return;
    }

    const bestNow = (await api.rpc.chain.getHeader()).number.toNumber();
    const depth = Math.max(0, bestNow - inclusionNumber);
    updateConfirmed(periodId, {
      confirmation_depth: depth,
    });
  } catch (err) {
    logger.warn({ err, periodId, inclusionNumber }, 'confirmation finalize error; skipping');
  }
};
