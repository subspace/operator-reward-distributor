## Configuration

The application is configured via environment variables (dotenv supported). All amounts are in shannons unless stated otherwise.

### Required

- CHAIN_WS: Comma-separated WebSocket RPC endpoints (e.g., `wss://rpc-1,wss://rpc-2`).
- CHAIN_ID: Logical identifier for the target chain/network.
- INTERVAL_SECONDS: Length of a period in seconds; one emission can occur per period.
- TIP_AI3: Tip amount per emission in AI3 decimal format (e.g., `0.05`).
- DAILY_CAP_AI3: Daily cap in AI3; emissions are skipped when the next tip would exceed this cap.
- ACCOUNT_PRIVATE_KEY: 0x-prefixed 32-byte hex private key used to sign transactions.

### Optional / Defaults

- SERVER_PORT (default: 3001): Port for the HTTP API server.
- SCHEDULER_PORT (default: 3000): Port for the scheduler health endpoint.
- SCHEDULER_HEALTH_URL: If unset, defaults to `http://127.0.0.1:${SCHEDULER_PORT}/`.
- MAX_RETRIES (default: 5): Maximum internal retries on transient errors.
- MORTALITY_BLOCKS (default: 64): Transaction mortality window used for safety.
- CONFIRMATIONS (default: 10): Required depth before marking an emission as confirmed.
- DB_URL (default: `sqlite:./ord.sqlite`): SQLite database path.
- LOG_LEVEL: Pino log level (`debug` in dev, `info` in production by default).
- LOG_FILE_PATH: When set, logs are also written to this file (dirs auto-created).
- LOG_TO_CONSOLE (default: true): Set to `false` to disable console logging.

### Notes

- TIP_AI3 and DAILY_CAP_AI3 are converted to shannons (u128). Values must be positive and within u128 bounds.
- CHAIN_WS is validated and must contain at least one valid `ws://` or `wss://` URL.
- Multiple RPC endpoints are used for resilience; the client handles reconnects and cleans up on errors.
