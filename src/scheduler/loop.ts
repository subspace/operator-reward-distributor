import { getApi } from '../chain/api.js';
import { loadConfig } from '../config.js';
import { reserveEmissionIfNeeded } from '../db/emissions.js';
import { logger } from '../logger.js';
import { submitForPeriod } from '../pipeline/submit.js';
import { createBackoff, sleep } from '../utils/backoff.js';

import { computePeriodId, getOnChainTimestampMs } from './period.js';

export const runScheduler = async (): Promise<void> => {
  const cfg = loadConfig();
  const backoff = createBackoff({
    initialMs: 2000,
    maxMs: 30000,
    multiplier: 1.8,
    jitterRatio: 0.2,
  });

  while (true) {
    try {
      const api = await getApi();
      const tsMs = await getOnChainTimestampMs(api);
      const periodId = computePeriodId(tsMs, cfg.INTERVAL_SECONDS);
      const reserved = reserveEmissionIfNeeded(periodId);
      if (reserved) {
        logger.info({ periodId }, 'reserved period');
        // fire-and-forget submission with error handling; internal retries happen downstream if needed
        submitForPeriod(periodId).catch((e) => {
          logger.error({ err: e, periodId }, 'submission error');
        });
      }
      backoff.reset();
    } catch (e) {
      logger.error({ err: e }, 'scheduler error');
      const delay = backoff.nextDelayMs();
      await sleep(delay);
      continue;
    }
    await sleep(2000);
  }
};
