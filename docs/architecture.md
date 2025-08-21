## Architecture

### High-level components

- **Scheduler**
  - Polls on-chain time and computes the current period.
  - Idempotently reserves an emission for the period (unique `(chain_id, period_id)`).
  - Triggers asynchronous submission when a new reservation is made.

- **Pipeline**
  - Pre-submit checks (budget).
  - Compose remark payload and extrinsic.
  - Sign and send with a tip; persist hashes and payload.
  - Track inclusion/confirmation depth in the background.

- **API Server**
  - REST endpoints: `/health`, `/info`, `/config`, `/budget`, `/emissions`, `/emissions/:periodId`.
  - Surfaces node connectivity, current period, configuration, budget status and emission history.

- **Database**
  - SQLite with WAL mode.
  - Single `emissions` table acts as the source of truth for scheduling and auditing.

- **Chain Client**
  - Connects via WebSocket to one or more RPC endpoints.
  - Auto-reconnects and cleans up state on errors.

- **Wallet/Signer**
  - Uses a configured private key to sign extrinsics.

### Data flow

1. Scheduler calculates the period from on-chain timestamp.
2. A reservation row is inserted (`status = scheduled`).
3. Submission composes `system.remark` with a versioned payload and specified tip.
4. On inclusion, the extrinsic hash and block info are recorded (`status = submitted`).
5. A background task checks confirmation depth and marks the row `confirmed`.

### Design goals

- **Idempotent**: Period key ensures at-most-once emission per chain/period.
- **Safe spend**: Budget guard prevents exceeding configured daily cap.
- **Operational simplicity**: Short-lived RPC calls, retries with backoff, simple schema.
- **Observability**: Structured logs, REST status endpoints, durable DB records.
