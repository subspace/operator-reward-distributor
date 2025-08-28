## Operations

This directory contains deployment artifacts and instructions for running Operator Reward Distributor in production-like environments.

### Structure

- `compose/` — Docker Compose deployment (local node, scheduler, API)
- `systemd/` — Reserved for native/systemd unit files (optional)

The runnable artifacts live under `infra/compose/`.

### Prerequisites

- Docker and Docker Compose plugin installed

### Quick start (Docker Compose)

1. Copy and edit environment:

```bash
cp infra/compose/.env.example infra/compose/.env
```

2. Build and start the stack:

```bash
docker compose -f infra/compose/docker-compose.yml up -d --build
```

3. Check API health:

```bash
curl -s http://127.0.0.1:${SERVER_PORT:-3001}/health
```

4. Tail logs:

```bash
docker compose -f infra/compose/docker-compose.yml logs -f ord-api ord-scheduler
```

### Configuration

- App variables are documented in `src/config.ts`. Compose reads `infra/compose/.env` via `env_file`.
- Root `.env.example` is for local development (`yarn dev`/`yarn serve`) and is not used by Compose.
- Set `NODE_DOCKER_TAG`, `NETWORK_ID`, and (optionally) `DOMAIN_ID` in `infra/compose/.env`. Compose uses `${DOMAIN_ID:-0}` to default the domain id to 0 if unset. Adjust node flags in `infra/compose/docker-compose.yml` as needed.
- Conditional local node: the `node` service is under the `local-node` profile. To run with a local node, pass the profile:

```bash
docker compose -f infra/compose/docker-compose.yml --profile local-node up -d --build
```

### Upgrades

```bash
docker compose -f infra/compose/docker-compose.yml up -d --build
```

### Shutdown

```bash
docker compose -f infra/compose/docker-compose.yml down
```

To remove persisted SQLite data as well, add `-v` (careful: destructive).

### Run with built-in Nginx proxy (local)

1. Copy env and adjust values

```bash
cp infra/compose/.env.example infra/compose/.env
# edit CHAIN_WS, ACCOUNT_PRIVATE_KEY, TIP_AI3, DAILY_CAP_AI3, etc.
```

2. Start stack (scheduler + api + proxy)

```bash
docker compose -f infra/compose/docker-compose.yml up -d --build
```

3. Verify

```bash
curl -s http://127.0.0.1:${PROXY_HOST_PORT:-80}/health | jq .
```

Notes:

- API service binds to `SERVER_HOST=0.0.0.0` inside the network; it is not exposed directly.
- Nginx listens on host port `${PROXY_HOST_PORT}` (default 80) and proxies to `api:3001`.
- Sensitive endpoints `/config` and `/info` are allowlisted to `127.0.0.1` by default in `infra/compose/nginx.conf`.
- For production, front Nginx with TLS (LB or certbot) and restrict access as needed.
