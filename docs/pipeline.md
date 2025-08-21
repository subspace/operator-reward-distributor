## Pipeline and Scheduler

### Period calculation

- The scheduler queries on-chain time, divides by `INTERVAL_SECONDS`, and computes an integer `period_id`.
- This ensures time is driven by the chain rather than local clocks.

### Reservation (idempotency)

- The scheduler inserts a `scheduled` row keyed by `(chain_id, period_id)` using an idempotent insert.
- If the row already exists, no submission is started (another instance already reserved it).

### Pre-submit checks

- Budget guard sums the day’s spend and compares it to `DAILY_CAP_AI3` (in shannons after conversion).
- If the next emission would exceed the cap, the row is marked `skipped_budget`.

### Submission

- Compose a versioned remark payload and `system.remark` extrinsic.
- Sign with the configured account and include the configured tip.
- On inclusion, record extrinsic hash, block hash and number; mark `submitted`.

### Confirmation tracking

- A background task polls head and waits until `CONFIRMATIONS` depth.
- If the canonical hash at the inclusion block changes (reorg before depth), the row remains `submitted`.
- Otherwise, update `confirmation_depth` and mark as `confirmed`.

### Resilience

- Transient failures use exponential backoff with jitter.
- Chain client auto-reconnects and cleans up on provider/API errors.
