import { describe, expect, it } from 'vitest';

import { parseShannons, toDecimalString } from '../src/utils/amounts.js';

describe('parseShannons', () => {
  it('parses valid digit strings', () => {
    expect(parseShannons('1')).toBe(1n);
    expect(parseShannons('1000000000000000000')).toBe(1000000000000000000n);
  });

  it('accepts bigint', () => {
    expect(parseShannons(5n)).toBe(5n);
  });

  it('rejects number', () => {
    expect(() => parseShannons(1 as unknown as number)).toThrow();
  });

  it('rejects non-digit strings and zero/negative', () => {
    expect(() => parseShannons('01.0')).toThrow();
    expect(() => parseShannons('-1')).toThrow();
    expect(() => parseShannons('0')).toThrow();
    expect(() => parseShannons('1e18')).toThrow();
    expect(() => parseShannons('abc')).toThrow();
  });
});

describe('toDecimalString', () => {
  it('serializes small bigint to base-10 string', () => {
    expect(toDecimalString(123n)).toBe('123');
  });

  it('serializes large bigint to base-10 string', () => {
    expect(toDecimalString(123456789012345678901234567890n)).toBe('123456789012345678901234567890');
  });
});
