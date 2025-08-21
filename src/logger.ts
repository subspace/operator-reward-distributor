import pino, { type TransportMultiOptions, type TransportTargetOptions } from 'pino';

const isDev = process.env.NODE_ENV !== 'production';
const resolvedLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');

// Optional file logging configuration
// LOG_FILE_PATH: when set, logs are also written to this file (directories created automatically)
// LOG_TO_CONSOLE: set to 'false' to disable console logging (default: true)
const logFilePath = process.env.LOG_FILE_PATH;
const logToConsole = (process.env.LOG_TO_CONSOLE || 'true').toLowerCase() !== 'false';

// Build transport targets dynamically so we can output to both console and file
const targets: TransportTargetOptions[] = [];

if (logToConsole) {
  if (isDev) {
    targets.push({
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard' },
      level: resolvedLevel,
    });
  } else {
    // In production, write raw JSON to stdout (fd 1)
    targets.push({
      target: 'pino/file',
      options: { destination: 1 },
      level: resolvedLevel,
    });
  }
}

if (logFilePath && logFilePath.length > 0) {
  targets.push({
    target: 'pino/file',
    options: { destination: logFilePath, mkdir: true },
    level: resolvedLevel,
  });
}

const transport: TransportMultiOptions | undefined = targets.length > 0 ? { targets } : undefined;

export const pinoOptions: pino.LoggerOptions = {
  level: resolvedLevel,
  transport,
  redact: {
    // cast to mutable string[] for Pino's type expectations
    paths: [
      'ACCOUNT_MNEMONIC',
      'mnemonic',
      'seed',
      'password',
      'ACCOUNT_PRIVATE_KEY',
      'privateKey',
    ] as string[],
    censor: '[redacted]',
  },
};

export const logger = pino(pinoOptions);
