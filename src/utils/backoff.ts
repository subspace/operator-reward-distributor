export interface BackoffOptions {
  initialMs: number;
  maxMs: number;
  multiplier: number;
  jitterRatio: number;
}

export interface BackoffController {
  nextDelayMs: () => number;
  reset: () => void;
}

const defaultOptions: BackoffOptions = {
  initialMs: 2000,
  maxMs: 30000,
  multiplier: 1.8,
  jitterRatio: 0.2,
};

export const createBackoff = (options: Partial<BackoffOptions> = {}): BackoffController => {
  const opts: BackoffOptions = { ...defaultOptions, ...options };
  let attempt = 0;

  const computeDelay = (attemptIdx: number): number => {
    const exp = Math.min(
      opts.maxMs,
      Math.floor(opts.initialMs * Math.pow(opts.multiplier, attemptIdx))
    );
    const jitter = exp * opts.jitterRatio * (Math.random() * 2 - 1);
    const delay = Math.max(0, Math.floor(exp + jitter));
    return delay;
  };

  const nextDelayMs = (): number => {
    const delay = computeDelay(attempt);
    attempt = Math.min(attempt + 1, 1000);
    return delay;
  };

  const reset = (): void => {
    attempt = 0;
  };

  return { nextDelayMs, reset };
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
