import { loadConfig } from '../config.js';

/**
 * Versioned remark payload schema (v1).
 *
 * - version: literal to identify the schema for future upgrades.
 * - period: integer period id (floor(on-chain timestamp ms / (N*1000))) used for idempotency.
 * - tipShannons: decimal string of the tip amount in shannons (1 AI3 = 1e18 shannons) for auditability.
 */
export interface RemarkPayloadV1 {
  /** Schema identifier */
  version: 'ORD:v1';
  /** Period id for at-most-once emission and reporting */
  period: number;
  /** Tip amount in shannons as a string */
  tipShannons: string;
}

/** Build a v1 remark payload for a given period. */
export const buildRemarkV1 = (periodId: number): RemarkPayloadV1 => {
  const cfg = loadConfig();
  const tip = cfg.TIP_SHANNONS.toString();
  return {
    version: 'ORD:v1',
    period: periodId,
    tipShannons: tip,
  } as const;
};

/** Serialize the payload stored in system.remark */
export const serializeRemark = (payload: RemarkPayloadV1): string =>
  `${payload.version};period=${payload.period};tip=${payload.tipShannons}`;
