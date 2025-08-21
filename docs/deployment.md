## Deployment and Operations

### Binaries and runtime

- Node.js 20+ required.
- Build with `yarn build`; run scheduler with `yarn start`, API with `yarn serve` (dev via `tsx`).

### Containerized deployment

Docker Compose is provided under `infra/compose`:

- `scheduler`: runs the background scheduler and exposes a simple health endpoint.
- `api`: exposes REST endpoints for health, info, config, budget, and emissions.
- `node` (optional, profile `local-node`): local chain node for development.

Operational notes:

- Set `.env` for shared configuration (CHAIN_WS, CHAIN_ID, TIP_AI3, DAILY_CAP_AI3, etc.).
- Database is persisted under a named volume and mounted at `/data/ord.sqlite`.
- Logs can be written to a file via `LOG_FILE_PATH`; host mapping provided at `./data/logs`.
- Health checks probe `/` for scheduler and `/health` for API.

### Monitoring

- Scrape the API’s `/health` and `/budget` for basic SLOs and spend visibility.
- Tail JSON logs (stdout or file) for errors and submission events.
