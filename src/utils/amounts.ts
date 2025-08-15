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
