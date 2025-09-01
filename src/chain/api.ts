import { ApiPromise, WsProvider } from '@polkadot/api';

import { loadConfig } from '../config.js';
import { logger } from '../logger.js';

let apiInstance: ApiPromise | null = null;
let providerInstance: WsProvider | null = null;

const getOrCreateProvider = (): WsProvider => {
  if (providerInstance) return providerInstance;

  const cfg = loadConfig();
  const provider = new WsProvider(cfg.rpcEndpoints);
  providerInstance = provider;

  provider.on('connected', () => {
    logger.info({ endpoints: cfg.rpcEndpoints }, 'chain connected');
    logger.info({ connectedEndpoint: provider.endpoint }, 'connected endpoint');
  });

  provider.on('disconnected', () => {
    logger.warn('chain disconnected');
    // Do not tear down; allow WsProvider to auto-rotate/retry
  });

  provider.on('error', (err) => {
    logger.error({ err }, 'chain provider error');
    // Do not tear down; allow WsProvider to auto-rotate/retry
  });

  return providerInstance;
};

export const getApi = async (): Promise<ApiPromise> => {
  if (apiInstance && apiInstance.isConnected) {
    return apiInstance;
  }

  const provider = getOrCreateProvider();

  if (!apiInstance) {
    apiInstance = await ApiPromise.create({ provider });

    apiInstance.on('error', (err) => {
      logger.error({ err }, 'chain api error');
      // Keep provider alive; ApiPromise will recover when provider reconnects
    });

    await apiInstance.isReadyOrError;
    logger.info('chain api ready');
  }

  return apiInstance;
};

export const disconnectApi = async (): Promise<void> => {
  if (apiInstance) {
    try {
      await apiInstance.disconnect();
    } catch (e) {
      logger.warn({ err: e }, 'error disconnecting ApiPromise');
    } finally {
      apiInstance = null;
    }
  }

  if (providerInstance) {
    try {
      await providerInstance.disconnect();
    } catch (e) {
      logger.warn({ err: e }, 'error disconnecting WsProvider');
    } finally {
      providerInstance = null;
    }
  }
};
