import { getApi } from '../chain/api.js';
import { loadConfig } from '../config.js';
import { updateConfirmed, updateInclusion } from '../db/emissions.js';
import { logger } from '../logger.js';
import { createBackoff, sleep } from '../utils/backoff.js';

export const trackConfirmation = async (
  periodId: number,
  inclusionHash: string,
  inclusionNumber: number
): Promise<void> => {
  const cfg = loadConfig();
  const backoff = createBackoff({
    initialMs: 3000,
    maxMs: 30000,
    multiplier: 1.8,
    jitterRatio: 0.2,
  });

  updateInclusion(periodId, {
    block_hash: inclusionHash,
    block_number: inclusionNumber,
  });

  const target = inclusionNumber + cfg.CONFIRMATIONS;

  // Poll best head until target reached
  // Simple and robust; avoids keeping a long-lived subscription
  // wait loop
  while (true) {
    try {
      const api = await getApi();
      const head = await api.rpc.chain.getHeader();
      const best = head.number.toNumber();
      if (best >= target) {
        break;
      }
      // healthy step when connected: constant small poll
      await sleep(6000);
      backoff.reset();
    } catch (err) {
      logger.warn({ err, periodId, inclusionNumber }, 'confirmation polling error; retrying');
      const delay = backoff.nextDelayMs();
      await sleep(delay);
      continue;
    }
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
