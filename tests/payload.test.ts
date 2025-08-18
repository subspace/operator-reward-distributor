import { describe, expect, it, vi } from 'vitest';

import { buildRemarkV1, serializeRemark } from '../src/tx/payload.js';

vi.mock('../src/config.js', () => ({
  loadConfig: () => ({
    TIP_SHANNONS: 1000000000000000000n,
    CHAIN_ID: '0x1234567890abcdef',
  }),
}));

describe('remark payload', () => {
  it('builds and serializes v1 payload', () => {
    const p = buildRemarkV1(12345);
    expect(p.version).toBe('ORD:v1');
    expect(p.period).toBe(12345);
    expect(p.tipShannons).toBe('1000000000000000000');

    const s = serializeRemark(p);
    expect(s).toContain('ORD:v1');
    expect(s).toContain('period=12345');
    expect(s).toContain('tip=1000000000000000000');
  });
});
