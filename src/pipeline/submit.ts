import { getApi } from '../chain/api.js';
import { loadConfig } from '../config.js';
import { updateSubmitted } from '../db/emissions.js';
import { composeRemarkWithTip } from '../tx/compose.js';
import { signAndSendWithTip } from '../tx/send.js';
import { getSigner } from '../wallet/signer.js';

import { trackConfirmation } from './confirm.js';

export const submitForPeriod = async (periodId: number): Promise<void> => {
  const cfg = loadConfig();
  const api = await getApi();

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
