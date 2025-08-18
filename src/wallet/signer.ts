import { Keyring } from '@polkadot/keyring';

import { loadConfig } from '../config.js';
import { logger } from '../logger.js';

export const getSigner = () => {
  const cfg = loadConfig();
  const keyring = new Keyring({ type: 'ethereum' });
  const pair = keyring.addFromUri(cfg.ACCOUNT_PRIVATE_KEY);
  logger.info({ address: pair.address }, 'address');
  return pair;
};
