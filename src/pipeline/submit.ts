import { checkBudget } from '../budget/rules.js';
import { getApi } from '../chain/api.js';
import { loadConfig } from '../config.js';
import { recordSkipped, updateSubmitted } from '../db/emissions.js';
import { logger } from '../logger.js';
import { composeRemarkWithTip } from '../tx/compose.js';
import { signAndSendWithTip } from '../tx/send.js';
import { getSigner } from '../wallet/signer.js';

import { trackConfirmation } from './confirm.js';

export const submitForPeriod = async (periodId: number): Promise<void> => {
  const cfg = loadConfig();
  const api = await getApi();

  const budget = checkBudget();
  if (!budget.ok) {
    const reason = budget.reason === 'paused' ? 'paused' : 'skipped_budget';
    recordSkipped(periodId, reason);
    logger.warn({ periodId, reason }, 'skipping emission');
    return;
  }

  const { extrinsic, payload, tipValue } = composeRemarkWithTip(
    api,
    periodId,
    cfg.ORD_TIP_SHANNONS
  );

  const signer = getSigner();
  const { extrinsicHash, blockNumber, blockHash } = await signAndSendWithTip(
    api,
    extrinsic,
    signer,
    tipValue
  );

  updateSubmitted(periodId, {
    extrinsic_hash: extrinsicHash,
    remark_payload: JSON.stringify(payload),
  });

  // Track inclusion/confirmation depth; best-effort in background
  void trackConfirmation(periodId, blockHash, blockNumber);
};
