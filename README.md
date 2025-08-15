# Operator Reward Distributor

Service to periodically submit `system.remark` extrinsics with a tip on Autonomys Network Auto-EVM(AI3) to incentivize network operators.

## Getting started

1. Enable Yarn and install deps

```bash
corepack enable
yarn install
```

2. Configure env

```bash
cp .env.example .env
# edit .env and set ORD_ACCOUNT_MNEMONIC (and other values as needed)
```

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

## License

[Unlicense](LICENSE)
