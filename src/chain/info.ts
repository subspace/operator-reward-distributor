import type { ApiPromise } from '@polkadot/api';

export interface ChainInfo {
  chain: string;
  nodeName: string;
  nodeVersion: string;
  ss58Format: number | null;
  tokenSymbol: string | null;
  tokenDecimals: number | null;
}

export const getChainInfo = async (api: ApiPromise): Promise<ChainInfo> => {
  const [chain, nodeName, nodeVersion] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version(),
  ]);

  const props = api.registry.getChainProperties();
  const ss58Format = props?.ss58Format?.isSome ? props.ss58Format.unwrap().toNumber() : null;
  const tokenSymbol = props?.tokenSymbol?.isSome
    ? (props.tokenSymbol.unwrap()[0]?.toString() ?? null)
    : null;
  const tokenDecimals = props?.tokenDecimals?.isSome
    ? (props.tokenDecimals.unwrap()[0]?.toNumber() ?? null)
    : null;

  return {
    chain: chain.toString(),
    nodeName: nodeName.toString(),
    nodeVersion: nodeVersion.toString(),
    ss58Format,
    tokenSymbol,
    tokenDecimals,
  };
};
