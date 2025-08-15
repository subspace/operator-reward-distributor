import { ApiPromise } from '@polkadot/api';

import { buildRemarkV1, serializeRemark } from './payload.js';

export const composeRemarkWithTip = (api: ApiPromise, periodId: number, tip: string | bigint) => {
  const payload = buildRemarkV1(periodId);
  const remark = serializeRemark(payload);
  const extrinsic = api.tx.system.remark(remark);
  return { extrinsic, payload, tipValue: tip } as const;
};
