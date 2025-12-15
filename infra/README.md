## Operations

This directory contains deployment artifacts and instructions for running Operator Reward Distributor in production-like environments.

### Structure

- `compose/` — Docker Compose deployment (local node, scheduler, API)

The runnable artifacts live under `infra/compose/`.

### Prerequisites

- Docker and Docker Compose plugin installed

### Building Docker Images with GitHub Actions

The repository includes a GitHub Actions workflow (`.github/workflows/docker-build.yml`) that can build Docker images from any branch.

#### Using GitHub Actions UI

1. Go to the **Actions** tab in your GitHub repository
2. Select **Build Docker Image** workflow
3. Click **Run workflow**
4. Choose the branch to build from
5. Optionally:
   - Enable **Push image to registry** to push to GitHub Container Registry
   - Set a custom **Image tag** (defaults to branch name)
6. Click **Run workflow**

#### Using Pre-built Images

After building an image via GitHub Actions, you can use it in your deployment:

1. Set `APP_IMAGE` in `infra/compose/.env`:

```bash
APP_IMAGE=ghcr.io/autonomys/operator-reward-distributor:main
```

2. Pull and start the stack (no build needed):

```bash
docker compose -f infra/compose/docker-compose.yml pull
docker compose -f infra/compose/docker-compose.yml up -d
```

**Note:** When `APP_IMAGE` is set, docker-compose will use the pre-built image and skip local builds. Leave `APP_IMAGE` unset to build from source locally.

#### Image Tags

Images are tagged with:

- Branch name (e.g., `main`, `develop`)
- Commit SHA with branch prefix (e.g., `main-abc1234`)
- Custom tag if specified in workflow dispatch

Images are pushed to: `ghcr.io/autonomys/operator-reward-distributor`

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
- Set `APP_IMAGE` in `infra/compose/.env` to use a pre-built image from registry (e.g., from GitHub Actions). Leave unset to build locally.
- Set `NODE_DOCKER_TAG`, `NETWORK_ID`, and (optionally) `DOMAIN_ID` in `infra/compose/.env`. Compose uses `${DOMAIN_ID:-0}` to default the domain id to 0 if unset. Adjust node flags in `infra/compose/docker-compose.yml` as needed.
- Conditional local node: the `node` service is under the `local-node` profile. To run with a local node, use the local-node override (adds `scheduler -> node` health dependency) and pass the profile:

````bash
docker compose \
  -f infra/compose/docker-compose.yml \
  -f infra/compose/docker-compose.local-node.yml \
  --profile local-node up -d --build

Alternatively, set the files once in your shell:

```bash
export COMPOSE_FILE=infra/compose/docker-compose.yml:infra/compose/docker-compose.local-node.yml
docker compose --profile local-node up -d --build
````

````

### Upgrades

```bash
docker compose -f infra/compose/docker-compose.yml up -d --build
````

### Shutdown

```bash
docker compose -f infra/compose/docker-compose.yml down
```

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
- Nginx listens on host port `${PROXY_HOST_PORT}` (default 80) and proxies to `api:${SERVER_PORT}`.
- Sensitive endpoints `/config` and `/info` are allowlisted to `127.0.0.1` by default in `infra/compose/nginx.conf`.
- For production, front Nginx with TLS (LB or certbot) and restrict access as needed.

### Run with local-node profile (embedded node)

1. Copy env and adjust values

```bash
cp infra/compose/.env.example infra/compose/.env
# edit NODE_DOCKER_TAG, NETWORK_ID (and optionally DOMAIN_ID)
# set ACCOUNT_PRIVATE_KEY, TIP_AI3, DAILY_CAP_AI3, etc.
```

2. Start stack with local node enabled (base + override)

```bash
docker compose \
  -f infra/compose/docker-compose.yml \
  -f infra/compose/docker-compose.local-node.yml \
  --profile local-node up -d --build
```

3. Verify

```bash
# API via Nginx proxy
curl -s http://127.0.0.1:${PROXY_HOST_PORT:-80}/health | jq .

# Optional: check embedded node JSON-RPC directly
curl -s -H 'Content-Type: application/json' \
  -d '{"id":1,"jsonrpc":"2.0","method":"system_health","params":[]}' \
  http://127.0.0.1:9944/ | jq .
```

Notes:

- The `node` service is only started when the `local-node` profile is used.
- The local-node override (`docker-compose.local-node.yml`) makes `scheduler` wait until `node` is healthy before starting.
- `.env.example` sets `CHAIN_WS=ws://node:8944,...` so the app uses the embedded node's WebSocket RPC by default. JSON-RPC HTTP remains at `127.0.0.1:9944` (used by the healthcheck).
- Node RPC ports are forwarded to the host at `127.0.0.1:9944` (HTTP) and `127.0.0.1:8944` (WebSocket); see `docker-compose.yml`.
