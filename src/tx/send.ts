import type { ApiPromise } from '@polkadot/api';
import type { SubmittableExtrinsic } from '@polkadot/api/types';

import { logger } from '../logger.js';

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
  logger.info(
    {
      tipShannons: tip.toString(),
      signerAddress: signer.address,
    },
    'submitting transaction to network'
  );

  const { extrinsicHash, blockHash } = await new Promise<{
    extrinsicHash: string;
    blockHash: string;
  }>((resolve, reject) => {
    extrinsic
      .signAndSend(signer, { tip }, ({ status, dispatchError }) => {
        if (dispatchError) {
          logger.error(
            {
              dispatchError: dispatchError.toString(),
              extrinsicHash: extrinsic.hash.toHex(),
            },
            'transaction dispatch error'
          );
          reject(new Error(dispatchError.toString()));
          return;
        }

        const extrinsicHashHex = extrinsic.hash.toHex();

        if (status.isInBlock) {
          const blockHashHex = status.asInBlock.toHex();
          logger.info(
            {
              extrinsicHash: extrinsicHashHex,
              blockHash: blockHashHex,
              status: 'included_in_block',
            },
            'transaction included in block'
          );
          resolve({ extrinsicHash: extrinsicHashHex, blockHash: blockHashHex });
        } else if (status.isFinalized) {
          const blockHashHex = status.asFinalized.toHex();
          logger.info(
            {
              extrinsicHash: extrinsicHashHex,
              blockHash: blockHashHex,
              status: 'finalized',
            },
            'transaction finalized'
          );
          resolve({ extrinsicHash: extrinsicHashHex, blockHash: blockHashHex });
        } else if (status.isBroadcast) {
          logger.debug(
            {
              extrinsicHash: extrinsicHashHex,
              status: 'broadcast',
            },
            'transaction broadcast to network'
          );
        }
      })
      .catch(reject);
  });

  const header = await api.rpc.chain.getHeader(blockHash);
  return { extrinsicHash, blockHash, blockNumber: header.number.toNumber() };
};
