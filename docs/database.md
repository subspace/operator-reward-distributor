## Database

SQLite is used as the durable store with WAL mode for reliability. Migrations are file-based and applied on startup in order.

### Schema

`emissions` is the primary table and acts as the ledger for scheduling and audit:

- chain_id: Target chain identifier
- period_id: Integer period key (unique with chain_id)
- scheduled_at, emitted_at, confirmed_at: Timestamps for state transitions
- remark_payload: Serialized remark payload included on-chain
- tip_shannons: Tip amount for this emission
- extrinsic_hash, block_hash, block_number: Inclusion details
- confirmation_depth: Depth when last checked
- status: One of `scheduled`, `submitted`, `confirmed`, `failed`, `skipped_budget`

Uniqueness of `(chain_id, period_id)` guarantees at-most-once reservation per period.

### State transitions

1. scheduled: Reservation created by the scheduler.
2. submitted: Extrinsic sent and included; hash and payload recorded.
3. confirmed: Required depth reached at the inclusion block.
4. failed: Submission encountered an error and could not be completed.
5. skipped_budget: Reservation marked skipped due to daily cap guard.

### Migrations

- SQL files under `migrations/` are applied exactly once and tracked in `_migrations`.
- Startup runs migrations automatically; this enables zero-touch container deployments.
