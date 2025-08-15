import { ApiPromise, WsProvider } from '@polkadot/api';

import { loadConfig } from '../config.js';

let apiInstance: ApiPromise | null = null;

export const getApi = async (): Promise<ApiPromise> => {
  if (apiInstance && apiInstance.isConnected) {
    return apiInstance;
  }

  const cfg = loadConfig();
  const provider = new WsProvider(cfg.rpcEndpoints);

  provider.on('connected', () => {
    console.log('[chain] connected');
  });
  provider.on('disconnected', () => {
    console.log('[chain] disconnected');
  });
  provider.on('error', (err) => {
    console.error('[chain] provider error', err);
  });

  apiInstance = await ApiPromise.create({ provider });
  await apiInstance.isReady;

  console.log('[chain] api ready');

  return apiInstance;
};

export const disconnectApi = async (): Promise<void> => {
  if (apiInstance) {
    await apiInstance.disconnect();
    apiInstance = null;
  }
};
