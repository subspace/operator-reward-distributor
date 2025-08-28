import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

import { parseAi3ToShannons } from './utils/amounts.js';

loadEnv();

const schema = z.object({
  // Comma-separated URLs supported (we validate after split)
  CHAIN_WS: z.string().min(1),
  CHAIN_ID: z.string().min(1),
  INTERVAL_SECONDS: z.coerce.number().int().positive(),
  SERVER_HOST: z.string().default('127.0.0.1'),
  SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  SCHEDULER_HOST: z.string().default('127.0.0.1'),
  SCHEDULER_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  SCHEDULER_HEALTH_URL: z.string().url().optional(),
  TIP_AI3: z.string().transform((s, ctx) => {
    try {
      return parseAi3ToShannons(s);
    } catch (e) {
      ctx.addIssue({ code: 'custom', message: (e as Error).message });
      return z.NEVER;
    }
  }),
  DAILY_CAP_AI3: z.string().transform((s, ctx) => {
    try {
      return parseAi3ToShannons(s);
    } catch (e) {
      ctx.addIssue({ code: 'custom', message: (e as Error).message });
      return z.NEVER;
    }
  }),
  MAX_RETRIES: z.coerce.number().int().min(0).default(5),
  MORTALITY_BLOCKS: z.coerce.number().int().min(1).default(64),
  CONFIRMATIONS: z.coerce.number().int().min(1).default(10),
  ACCOUNT_PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/i, 'ACCOUNT_PRIVATE_KEY must be 0x-prefixed 32-byte hex'),
  DB_URL: z.string().min(1).default('sqlite:./ord.sqlite'),
});

export interface AppConfig {
  CHAIN_WS: string;
  CHAIN_ID: string;
  INTERVAL_SECONDS: number;
  SERVER_HOST: string;
  SERVER_PORT: number;
  SCHEDULER_HOST: string;
  SCHEDULER_PORT: number;
  SCHEDULER_HEALTH_URL: string;
  TIP_SHANNONS: bigint;
  DAILY_CAP_SHANNONS: bigint;
  MAX_RETRIES: number;
  MORTALITY_BLOCKS: number;
  CONFIRMATIONS: number;
  ACCOUNT_PRIVATE_KEY: string;
  DB_URL: string;
  rpcEndpoints: string[];
}

export const loadConfig = (): AppConfig => {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid configuration: ${issues}`);
  }
  const env = parsed.data as any;
  const schedulerHealthUrl: string =
    env.SCHEDULER_HEALTH_URL && env.SCHEDULER_HEALTH_URL.length > 0
      ? env.SCHEDULER_HEALTH_URL
      : `http://127.0.0.1:${env.SCHEDULER_PORT}/`;
  const chainWsEntries = env.CHAIN_WS.split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  const rpcEndpoints = chainWsEntries.filter((u: string) => {
    try {
      // throws if invalid
      const url = new URL(u);
      return url.protocol === 'ws:' || url.protocol === 'wss:';
    } catch {
      return false;
    }
  });
  if (rpcEndpoints.length === 0) {
    throw new Error('Invalid configuration: CHAIN_WS must include at least one valid ws/wss URL');
  }
  const cfg: AppConfig = {
    CHAIN_WS: env.CHAIN_WS,
    CHAIN_ID: env.CHAIN_ID,
    INTERVAL_SECONDS: env.INTERVAL_SECONDS,
    SERVER_HOST: env.SERVER_HOST,
    SERVER_PORT: env.SERVER_PORT,
    SCHEDULER_HOST: env.SCHEDULER_HOST,
    SCHEDULER_PORT: env.SCHEDULER_PORT,
    SCHEDULER_HEALTH_URL: schedulerHealthUrl,
    TIP_SHANNONS: env.TIP_AI3,
    DAILY_CAP_SHANNONS: env.DAILY_CAP_AI3,
    MAX_RETRIES: env.MAX_RETRIES,
    MORTALITY_BLOCKS: env.MORTALITY_BLOCKS,
    CONFIRMATIONS: env.CONFIRMATIONS,
    ACCOUNT_PRIVATE_KEY: env.ACCOUNT_PRIVATE_KEY,
    DB_URL: env.DB_URL,
    rpcEndpoints,
  };
  return cfg;
};
