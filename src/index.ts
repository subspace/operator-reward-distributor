import { createServer } from 'http';

import { config } from 'dotenv';
config();

import { loadConfig } from './config.js';
import { runMigrations } from './db/migrate.js';
import { logger } from './logger.js';
import { runScheduler } from './scheduler/loop.js';

const port = loadConfig().SCHEDULER_PORT;

runMigrations();

const cfg = loadConfig();

const server = createServer((_, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('operator-reward-distributor running');
});

server.listen(port, () => {
  logger.info({ port, chainId: cfg.CHAIN_ID }, 'booted');
  // start scheduler in background
  runScheduler().catch((e) => {
    logger.error({ err: e }, 'scheduler error');
  });
});
