import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

import { parseAi3ToShannons } from './utils/amounts.js';

loadEnv();

const schema = z.object({
  CHAIN_WS: z.string().url(),
  CHAIN_ID: z.string().min(1),
  INTERVAL_SECONDS: z.coerce.number().int().positive(),
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
  ACCOUNT_MNEMONIC: z.string().min(1),
  DB_URL: z.string().min(1).default('sqlite:./ord.sqlite'),
  PAUSED: z.coerce.boolean().default(false),
  DRY_RUN: z.coerce.boolean().default(false),
});

export interface AppConfig {
  CHAIN_WS: string;
  CHAIN_ID: string;
  INTERVAL_SECONDS: number;
  TIP_SHANNONS: bigint;
  DAILY_CAP_SHANNONS: bigint;
  MAX_RETRIES: number;
  MORTALITY_BLOCKS: number;
  CONFIRMATIONS: number;
  RPC_FALLBACKS?: string;
  ACCOUNT_MNEMONIC: string;
  DB_URL: string;
  PAUSED: boolean;
  DRY_RUN: boolean;
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
    TIP_SHANNONS: env.TIP_AI3,
    DAILY_CAP_SHANNONS: env.DAILY_CAP_AI3,
    MAX_RETRIES: env.MAX_RETRIES,
    MORTALITY_BLOCKS: env.MORTALITY_BLOCKS,
    CONFIRMATIONS: env.CONFIRMATIONS,
    RPC_FALLBACKS: env.RPC_FALLBACKS,
    ACCOUNT_MNEMONIC: env.ACCOUNT_MNEMONIC,
    DB_URL: env.DB_URL,
    PAUSED: env.PAUSED,
    DRY_RUN: env.DRY_RUN,
    rpcEndpoints,
  };
  return cfg;
};
