import { getApi } from '../chain/api.js';
import { loadConfig } from '../config.js';
import { reserveEmissionIfNeeded } from '../db/emissions.js';
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
        console.log('[schedule] reserved period', periodId);
        // fire-and-forget submission; internal retries happen downstream if needed
        void submitForPeriod(periodId);
      }
    } catch (e) {
      console.error('[schedule] error', e);
    }
    await sleep(1000);
  }
};
