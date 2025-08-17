import { createHash } from 'node:crypto';

import { loadConfig } from '../config.js';

/**
 * Versioned remark payload schema (v1).
 *
 * - version: literal to identify the schema for future upgrades.
 * - period: integer period id (floor(on-chain timestamp ms / (N*1000))) used for idempotency.
 * - tipShannons: decimal string of the tip amount in shannons (1 AI3 = 1e18 shannons) for auditability.
 * - digest: sha256(chainId|period|tipShannons|nonce). Nonce is currently fixed to '0' (reserved for future use).
 */
export interface RemarkPayloadV1 {
  /** Schema identifier */
  version: 'ORD:v1';
  /** Period id for at-most-once emission and reporting */
  period: number;
  /** Tip amount in shannons as a string */
  tipShannons: string;
  /** Integrity digest of stable fields */
  digest: string;
}

/** Build a v1 remark payload for a given period. */
export const buildRemarkV1 = (periodId: number): RemarkPayloadV1 => {
  const cfg = loadConfig();
  const tip = cfg.TIP_SHANNONS.toString();
  // Preimage uses a fixed nonce '0' to allow future extensions without changing field layout.
  const preimage = `${cfg.CHAIN_ID}|${periodId}|${tip}|0`;
  const digest = createHash('sha256').update(preimage).digest('hex');
  return {
    version: 'ORD:v1',
    period: periodId,
    tipShannons: tip,
    digest,
  } as const;
};

/** Serialize the payload stored in system.remark */
export const serializeRemark = (payload: RemarkPayloadV1): string =>
  `${payload.version};period=${payload.period};tip=${payload.tipShannons};digest=${payload.digest}`;
