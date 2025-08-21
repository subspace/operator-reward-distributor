# Operator Reward Distributor

A reliable service that regularly sends an on‑chain remark with a tip on Autonomys Network (Auto‑EVM). The tip rewards the operators who include the transaction in a block, helping continuously incentivize network operators without changing any protocol rules.

### Why this exists

At mainnet launch, operator fees earned from regular network activity may not be sufficient to incentivize existing AI3 holders to nominate operators or to run operators themselves. Over time, operators should be able to self‑sustain from transaction fees, but while the ecosystem is bootstrapping, it makes sense to subsidize operator earnings with rewards. This service provides a straightforward, transparent way to distribute such rewards on‑chain.

### What it does

- Sends a transaction at a steady cadence (every N seconds) with a tip attached.
- Tips go to whoever includes the transaction in a block (i.e., active operators).
- Uses a on‑chain remark that takes up minimal execution time and block space

### What you need

- Node.js 20+ and Yarn.
- A funded account’s private key (0x‑prefixed, 32‑byte hex) to sign the transactions.
- WebSocket endpoint(s) for the network. You can list multiple, comma-separated in `CHAIN_WS`.

## Getting started

1. Enable Yarn and install deps

```bash
corepack enable
yarn install
```

2. Configure environment

```bash
cp .env.example .env
# edit .env and set ACCOUNT_PRIVATE_KEY (and other values as needed)
```

What you typically configure:

- Network address(es): set one or more WS endpoints in `CHAIN_WS`, comma-separated. The client rotates/reconnects automatically.
- How often to send (interval), how much to tip, and your daily tip budget
- How many confirmations to wait before considering a transaction final
- Where to store the local database and whether to run in dry‑run mode

3. Initialize database

```bash
yarn migrate
```

4. Run

```bash
yarn dev        # starts the HTTP stub and runs DB migrations on boot
yarn health     # prints chain info and current head
```

## Scripts

- `yarn dev`: run with tsx
- `yarn start`: run built JS from `dist`
- `yarn build`: compile TypeScript
- `yarn migrate`: apply SQL migrations in `migrations/`
- `yarn health`: show chain details via RPC
- `yarn lint` / `yarn format`: lint and format code

## Docker

See [infra/README.md](infra/README.md) for details.

## Documentation

See [docs/README.md](docs/README.md) for more detailed documentation.

## License

[Unlicense](LICENSE)
