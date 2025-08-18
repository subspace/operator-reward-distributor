import { Keyring } from '@polkadot/keyring';

import { loadConfig } from '../config.js';

export const getSigner = () => {
  const cfg = loadConfig();
  const keyring = new Keyring({ type: cfg.KEY_TYPE });
  const pair = keyring.addFromUri(cfg.ACCOUNT_PRIVATE_KEY);
  return pair;
};
