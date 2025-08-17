const U128_MAX = (1n << 128n) - 1n;

export const parseShannons = (value: string | bigint | number): bigint => {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number')
    throw new Error('Use string or bigint; number is unsafe for balances');
  const s = value.trim();
  if (!/^[0-9]+$/.test(s)) throw new Error('Invalid amount: only digits allowed (shannons)');
  const n = BigInt(s);
  if (n <= 0n) throw new Error('Amount must be > 0');
  if (n > U128_MAX) throw new Error('Amount exceeds u128 max');
  return n;
};

export const toDecimalString = (n: bigint): string => n.toString(10);

const AI3_SCALE = 10n ** 18n;

export const parseAi3ToShannons = (value: string): bigint => {
  const s = value.trim();
  if (!/^[0-9]+(\.[0-9]+)?$/.test(s)) throw new Error('Invalid AI3 amount');
  const [intPart, fracPartRaw = ''] = s.split('.');
  if (fracPartRaw.length > 18) throw new Error('Too many decimal places (max 18)');
  const fracPadded = (fracPartRaw + '0'.repeat(18)).slice(0, 18);
  const intBig = BigInt(intPart);
  const fracBig = BigInt(fracPadded);
  const result = intBig * AI3_SCALE + fracBig;
  if (result <= 0n) throw new Error('Amount must be > 0');
  if (result > U128_MAX) throw new Error('Amount exceeds u128 max');
  return result;
};
