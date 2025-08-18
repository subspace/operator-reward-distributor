import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

import { parseAi3ToShannons } from './utils/amounts.js';

loadEnv();

const schema = z.object({
  CHAIN_WS: z.string().url(),
  CHAIN_ID: z.string().min(1),
  INTERVAL_SECONDS: z.coerce.number().int().positive(),
  SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  SCHEDULER_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
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
  RPC_FALLBACKS: z.string().optional(),
  ACCOUNT_PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/i, 'ACCOUNT_PRIVATE_KEY must be 0x-prefixed 32-byte hex'),
  DB_URL: z.string().min(1).default('sqlite:./ord.sqlite'),
});

export interface AppConfig {
  CHAIN_WS: string;
  CHAIN_ID: string;
  INTERVAL_SECONDS: number;
  SERVER_PORT: number;
  SCHEDULER_PORT: number;
  TIP_SHANNONS: bigint;
  DAILY_CAP_SHANNONS: bigint;
  MAX_RETRIES: number;
  MORTALITY_BLOCKS: number;
  CONFIRMATIONS: number;
  RPC_FALLBACKS?: string;
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
  const rpcEndpoints = [env.CHAIN_WS, ...(env.RPC_FALLBACKS ? env.RPC_FALLBACKS.split(',') : [])]
    .map((s) => s.trim())
    .filter(Boolean);
  const cfg: AppConfig = {
    CHAIN_WS: env.CHAIN_WS,
    CHAIN_ID: env.CHAIN_ID,
    INTERVAL_SECONDS: env.INTERVAL_SECONDS,
    SERVER_PORT: env.SERVER_PORT,
    SCHEDULER_PORT: env.SCHEDULER_PORT,
    TIP_SHANNONS: env.TIP_AI3,
    DAILY_CAP_SHANNONS: env.DAILY_CAP_AI3,
    MAX_RETRIES: env.MAX_RETRIES,
    MORTALITY_BLOCKS: env.MORTALITY_BLOCKS,
    CONFIRMATIONS: env.CONFIRMATIONS,
    RPC_FALLBACKS: env.RPC_FALLBACKS,
    ACCOUNT_PRIVATE_KEY: env.ACCOUNT_PRIVATE_KEY,
    DB_URL: env.DB_URL,
    rpcEndpoints,
  };
  return cfg;
};
