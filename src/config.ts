import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

import { parseShannons } from './utils/amounts.js';

loadEnv();

const schema = z.object({
  ORD_CHAIN_WS: z.string().url(),
  ORD_CHAIN_ID: z.string().min(1),
  ORD_INTERVAL_SECONDS: z.coerce.number().int().positive(),
  ORD_TIP_SHANNONS: z.string().transform((s, ctx) => {
    try {
      return parseShannons(s);
    } catch (e) {
      ctx.addIssue({ code: 'custom', message: (e as Error).message });
      return z.NEVER;
    }
  }),
  ORD_DAILY_CAP_SHANNONS: z.string().transform((s, ctx) => {
    try {
      return parseShannons(s);
    } catch (e) {
      ctx.addIssue({ code: 'custom', message: (e as Error).message });
      return z.NEVER;
    }
  }),
  ORD_MAX_RETRIES: z.coerce.number().int().min(0).default(5),
  ORD_MORTALITY_BLOCKS: z.coerce.number().int().min(1).default(64),
  ORD_CONFIRMATIONS: z.coerce.number().int().min(1).default(10),
  ORD_RPC_FALLBACKS: z.string().optional(),
  ORD_ACCOUNT_MNEMONIC: z.string().min(1),
  ORD_DB_URL: z.string().min(1).default('sqlite:./ord.sqlite'),
  ORD_MODE: z.enum(['A']).default('A'),
  ORD_PAUSED: z.coerce.boolean().default(false),
  ORD_DRY_RUN: z.coerce.boolean().default(false),
});

export interface AppConfig extends z.infer<typeof schema> {
  rpcEndpoints: string[];
}

export const loadConfig = (): AppConfig => {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid configuration: ${issues}`);
  }
  const env = parsed.data;
  const rpcEndpoints = [
    env.ORD_CHAIN_WS,
    ...(env.ORD_RPC_FALLBACKS ? env.ORD_RPC_FALLBACKS.split(',') : []),
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  return { ...env, rpcEndpoints };
};
