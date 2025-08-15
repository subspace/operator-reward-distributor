import { getApi } from '../chain/api.js';
import { loadConfig } from '../config.js';
import { reserveEmissionIfNeeded } from '../db/emissions.js';
import { logger } from '../logger.js';
import { submitForPeriod } from '../pipeline/submit.js';

import { computePeriodId, getOnChainTimestampMs } from './period.js';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const runScheduler = async (): Promise<void> => {
  const cfg = loadConfig();
  const api = await getApi();

  while (true) {
    try {
      const tsMs = await getOnChainTimestampMs(api);
      const periodId = computePeriodId(tsMs, cfg.ORD_INTERVAL_SECONDS);
      const reserved = reserveEmissionIfNeeded(periodId);
      if (reserved) {
        logger.info({ periodId }, 'reserved period');
        // fire-and-forget submission with error handling; internal retries happen downstream if needed
        submitForPeriod(periodId).catch((e) => {
          logger.error({ err: e, periodId }, 'submission error');
        });
      }
    } catch (e) {
      logger.error({ err: e }, 'scheduler error');
    }
    await sleep(1000);
  }
};
