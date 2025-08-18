import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard' },
      }
    : undefined,
  redact: {
    paths: [
      'ACCOUNT_MNEMONIC',
      'mnemonic',
      'seed',
      'password',
      'ACCOUNT_PRIVATE_KEY',
      'privateKey',
    ],
    censor: '[redacted]',
  },
});
