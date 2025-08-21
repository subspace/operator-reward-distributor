import { ApiPromise, WsProvider } from '@polkadot/api';

import { loadConfig } from '../config.js';
import { logger } from '../logger.js';

let apiInstance: ApiPromise | null = null;
let providerInstance: WsProvider | null = null;

const cleanupApi = async (reason: string, err?: unknown): Promise<void> => {
  try {
    if (err) {
      logger.warn({ err, reason }, 'cleaning up chain api due to error');
    } else {
      logger.info({ reason }, 'cleaning up chain api');
    }
    if (apiInstance) {
      try {
        await apiInstance.disconnect();
      } catch (e) {
        logger.warn({ err: e }, 'error disconnecting ApiPromise');
      }
    }
    if (providerInstance) {
      try {
        await providerInstance.disconnect();
      } catch (e) {
        logger.warn({ err: e }, 'error disconnecting WsProvider');
      }
    }
  } finally {
    apiInstance = null;
    providerInstance = null;
  }
};

export const getApi = async (): Promise<ApiPromise> => {
  if (apiInstance && apiInstance.isConnected) {
    return apiInstance;
  }

  const cfg = loadConfig();
  const provider = new WsProvider(cfg.rpcEndpoints);
  providerInstance = provider;

  provider.on('connected', () => {
    logger.info({ endpoints: cfg.rpcEndpoints }, 'chain connected');
  });
  provider.on('disconnected', () => {
    logger.warn('chain disconnected');
    void cleanupApi('provider_disconnected');
  });
  provider.on('error', (err) => {
    logger.error({ err }, 'chain provider error');
    void cleanupApi('provider_error', err);
  });

  const api = await ApiPromise.create({ provider });
  await api.isReadyOrError;

  api.on('error', (err) => {
    logger.error({ err }, 'chain api error');
    void cleanupApi('api_error', err);
  });

  logger.info('chain api ready');
  apiInstance = api;
  return apiInstance;
};

export const disconnectApi = async (): Promise<void> => {
  await cleanupApi('manual_disconnect');
};
