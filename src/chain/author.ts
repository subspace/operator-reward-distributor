import type { ApiPromise } from '@polkadot/api';

export const getBlockAuthor = async (
  api: ApiPromise,
  blockHash: string
): Promise<string | null> => {
  try {
    // Prefer derive, which decorates headers with author when available
    const header = await (api.derive as any).chain.getHeader(blockHash);
    if (header?.author) return header.author.toString();
    return null;
  } catch {
    return null;
  }
};
