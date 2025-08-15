import type { SubmittableExtrinsic } from '@polkadot/api/types';

export interface SubmitResult {
  extrinsicHash: string;
}

export const signAndSendWithTip = async (
  extrinsic: SubmittableExtrinsic<'promise'>,
  signer: any,
  tip: string | bigint
): Promise<SubmitResult> => {
  const hash = await new Promise<string>((resolve, reject) => {
    extrinsic
      .signAndSend(signer, { tip }, ({ status, dispatchError }) => {
        if (dispatchError) {
          reject(new Error(dispatchError.toString()));
        } else if (status.isInBlock || status.isFinalized) {
          resolve(extrinsic.hash.toHex());
        }
      })
      .catch(reject);
  });

  return { extrinsicHash: hash };
};
