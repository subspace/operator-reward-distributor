import { ApiPromise, WsProvider } from '@polkadot/api';

import { loadConfig } from '../config.js';
import { logger } from '../logger.js';

let apiInstance: ApiPromise | null = null;

export const getApi = async (): Promise<ApiPromise> => {
  if (apiInstance && apiInstance.isConnected) {
    return apiInstance;
  }

  const cfg = loadConfig();
  const provider = new WsProvider(cfg.rpcEndpoints);

  provider.on('connected', () => {
    logger.info({ endpoints: cfg.rpcEndpoints }, 'chain connected');
  });
  provider.on('disconnected', () => {
    logger.warn('chain disconnected');
  });
  provider.on('error', (err) => {
    logger.error({ err }, 'chain provider error');
  });

  apiInstance = await ApiPromise.create({ provider });
  await apiInstance.isReady;

  logger.info('chain api ready');

  return apiInstance;
};

export const disconnectApi = async (): Promise<void> => {
  if (apiInstance) {
    await apiInstance.disconnect();
    apiInstance = null;
  }
};
