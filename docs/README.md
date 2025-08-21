## Overview

Operator Reward Distributor (ORD) periodically emits a small on-chain tip with a versioned remark for observability and accounting. It is designed to be simple, resilient, and safe-by-default:

- **Scheduler**: Computes the current period from on-chain time and reserves a single emission per period (idempotent).
- **Budget**: Enforces a daily cap (in shannons) to avoid overspending; emissions are skipped when over cap.
- **Submission**: Composes a `system.remark` extrinsic with a tip, signs, sends, and records results.
- **Confirmation tracking**: Updates depth and status after inclusion to mark confirmed emissions.
- **API**: Exposes lightweight endpoints for health, info, config, budget, and listing emissions.
- **Storage**: Uses SQLite (WAL) for durable state and simple operations.

The app favors simplicity: short-lived chain interactions, retries with jittered backoff, and explicit state transitions stored in the database.

## Key Concepts

- **Period**: Integer bucket derived from on-chain timestamp and `INTERVAL_SECONDS`. Only one emission is allowed per chain and period.
- **Remark payload**: Versioned, structured string (`ORD:v1;period=...;tip=...`) to support upgrades and external parsing.
- **Idempotency**: Guaranteed by the unique `(chain_id, period_id)` constraint; only the first reservation per period is accepted.
- **Budgeting**: Daily spend is tracked from the database and compared to a configured cap; no emission if cap would be exceeded.

## Getting Started

- Install: `yarn`
- Migrate DB: `yarn migrate`
- Run scheduler locally: `yarn dev` (or `yarn start` after `yarn build`)
- Run API server: `yarn serve` and visit `/health`, `/info`, `/config`, `/budget`, `/emissions`
- Check chain/endpoint health: `yarn health`

## Documentation Map

- Architecture: see `architecture.md`
- Configuration: see `configuration.md`
- Database: see `database.md`
- Pipeline and scheduler: see `pipeline.md`
- Transactions: see `transactions.md`
- Deployment and operations: see `deployment.md`
- Testing: see `testing.md`
