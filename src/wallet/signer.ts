import { Keyring } from '@polkadot/keyring';

import { loadConfig } from '../config.js';

export const getSigner = () => {
  const cfg = loadConfig();
  const keyring = new Keyring({ type: 'sr25519' });
  const pair = keyring.addFromUri(cfg.ACCOUNT_MNEMONIC);
  return pair;
};
