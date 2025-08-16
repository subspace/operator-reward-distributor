import type { ApiPromise } from '@polkadot/api';
import type { SubmittableExtrinsic } from '@polkadot/api/types';

export interface SubmitResult {
  extrinsicHash: string;
  blockHash: string;
  blockNumber: number;
}

export const signAndSendWithTip = async (
  api: ApiPromise,
  extrinsic: SubmittableExtrinsic<'promise'>,
  signer: any,
  tip: string | bigint
): Promise<SubmitResult> => {
  const { extrinsicHash, blockHash } = await new Promise<{
    extrinsicHash: string;
    blockHash: string;
  }>((resolve, reject) => {
    extrinsic
      .signAndSend(signer, { tip }, ({ status, dispatchError }) => {
        if (dispatchError) {
          reject(new Error(dispatchError.toString()));
          return;
        }
        if (status.isInBlock) {
          resolve({ extrinsicHash: extrinsic.hash.toHex(), blockHash: status.asInBlock.toHex() });
        } else if (status.isFinalized) {
          resolve({ extrinsicHash: extrinsic.hash.toHex(), blockHash: status.asFinalized.toHex() });
        }
      })
      .catch(reject);
  });

  const header = await api.rpc.chain.getHeader(blockHash);
  return { extrinsicHash, blockHash, blockNumber: header.number.toNumber() };
};
