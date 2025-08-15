import { getApi } from '../chain/api.js';
import { loadConfig } from '../config.js';
import { updateSubmitted } from '../db/emissions.js';
import { composeRemarkWithTip } from '../tx/compose.js';
import { signAndSendWithTip } from '../tx/send.js';
import { getSigner } from '../wallet/signer.js';

export const submitForPeriod = async (periodId: number): Promise<void> => {
  const cfg = loadConfig();
  const api = await getApi();

  const { extrinsic, payload, tipValue } = composeRemarkWithTip(
    api,
    periodId,
    cfg.ORD_TIP_SHANNONS.toString()
  );

  const signer = getSigner();
  const { extrinsicHash } = await signAndSendWithTip(extrinsic, signer, tipValue);

  updateSubmitted(periodId, {
    extrinsic_hash: extrinsicHash,
    remark_payload: JSON.stringify(payload),
  });
};
