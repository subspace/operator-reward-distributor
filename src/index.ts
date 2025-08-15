import { createServer } from 'http';

import { config } from 'dotenv';
config();

import { loadConfig } from './config.js';
import { runMigrations } from './db/migrate.js';
import { runScheduler } from './scheduler/loop.js';

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

runMigrations();

const cfg = loadConfig();

const server = createServer((_, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('operator-reward-distributor running');
});

server.listen(port, () => {
  console.log('[boot] listening on', port, 'chain', cfg.ORD_CHAIN_ID);
  // start scheduler in background
  void runScheduler();
});
