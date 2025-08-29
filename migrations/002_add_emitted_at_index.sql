-- Add index on emitted_at for fast sorting in getLastEmission queries
CREATE INDEX IF NOT EXISTS idx_emissions_emitted_at ON emissions (emitted_at DESC);
