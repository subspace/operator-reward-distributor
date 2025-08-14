import { config } from 'dotenv';
config();

import { createServer } from 'http';
import { loadConfig } from './config';

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const cfg = loadConfig();

const server = createServer((_, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('operator-reward-distributor running');
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log('[boot] listening on', port, 'chain', cfg.ORD_CHAIN_ID);
});
