import { checkBudget } from '../budget/rules.js';
import { getApi } from '../chain/api.js';
import { loadConfig } from '../config.js';
import { recordSkipped, updateFailed, updateSubmitted } from '../db/emissions.js';
import { logger } from '../logger.js';
import { composeRemarkWithTip } from '../tx/compose.js';
import { signAndSendWithTip } from '../tx/send.js';
import { getSigner } from '../wallet/signer.js';

import { trackConfirmation } from './confirm.js';

export const submitForPeriod = async (periodId: number): Promise<void> => {
  const cfg = loadConfig();
  const api = await getApi();

  logger.info(
    {
      periodId,
      tipShannons: cfg.TIP_SHANNONS.toString(),
      dailyCapShannons: cfg.DAILY_CAP_SHANNONS.toString(),
      chainId: cfg.CHAIN_ID,
    },
    'pre-submit checks'
  );

  const budget = checkBudget();
  if (!budget.ok) {
    const reason = 'skipped_budget';
    logger.warn(
      {
        periodId,
        reason,
        spentToday: budget.spentToday?.toString(),
        tipShannons: cfg.TIP_SHANNONS.toString(),
        dailyCapShannons: cfg.DAILY_CAP_SHANNONS.toString(),
      },
      'emission blocked by budget/paused'
    );
    recordSkipped(periodId, reason);
    logger.warn({ periodId, reason }, 'skipping emission');
    return;
  }

  const { extrinsic, payload, tipValue } = composeRemarkWithTip(api, periodId, cfg.TIP_SHANNONS);

  logger.info(
    {
      periodId,
      remarkPayload: JSON.stringify(payload),
      tipShannons: tipValue.toString(),
      extrinsicMethod: 'system.remark',
    },
    'extrinsic composed'
  );

  const signer = getSigner();
  try {
    const { extrinsicHash, blockNumber, blockHash } = await signAndSendWithTip(
      api,
      extrinsic,
      signer,
      tipValue
    );

    logger.info(
      {
        periodId,
        extrinsicHash,
        blockHash,
        blockNumber,
        tipShannons: tipValue.toString(),
      },
      'transaction submitted successfully'
    );

    updateSubmitted(periodId, {
      extrinsic_hash: extrinsicHash,
      remark_payload: JSON.stringify(payload),
    });

    logger.info(
      {
        periodId,
        extrinsicHash,
        blockHash,
        blockNumber,
      },
      'starting confirmation tracking'
    );

    // Track inclusion/confirmation depth; best-effort in background
    void trackConfirmation(periodId, blockHash, blockNumber);
    return;
  } catch (err) {
    logger.error({ periodId, err }, 'submission error');
    try {
      updateFailed(periodId);
    } catch (updateErr) {
      logger.warn({ periodId, updateErr }, 'failed to mark emission as failed');
    }
    return;
  }
};
