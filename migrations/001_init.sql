CREATE TABLE IF NOT EXISTS emissions (
  id INTEGER PRIMARY KEY,
  chain_id TEXT NOT NULL,
  period_id INTEGER NOT NULL,
  scheduled_at TEXT,
  emitted_at TEXT,
  remark_payload TEXT NOT NULL,
  tip_shannons TEXT NOT NULL,
  extrinsic_hash TEXT,
  block_hash TEXT,
  block_number INTEGER,
  confirmation_depth INTEGER,
  confirmed_at TEXT,
  status TEXT NOT NULL CHECK (status IN (
    'scheduled','submitted','confirmed','failed','skipped_budget','paused'
  )),
  UNIQUE(chain_id, period_id)
);


