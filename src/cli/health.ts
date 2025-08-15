import { getApi, disconnectApi } from '../chain/api.js';
import { getChainInfo } from '../chain/info.js';

const main = async (): Promise<void> => {
  const api = await getApi();
  const info = await getChainInfo(api);
  const head = await api.rpc.chain.getHeader();

  console.log(
    JSON.stringify(
      {
        chain: info.chain,
        node: `${info.nodeName} ${info.nodeVersion}`,
        ss58: info.ss58Format,
        token: { symbol: info.tokenSymbol, decimals: info.tokenDecimals },
        head: head.number.toString(),
      },
      null,
      2
    )
  );

  await disconnectApi();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
