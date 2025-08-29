-- Convert existing timestamps to ISO 8601 format with UTC indicator
-- This fixes timezone ambiguity by making UTC explicit

-- Convert existing datetime strings to ISO 8601 format with Z suffix
UPDATE emissions 
SET scheduled_at = scheduled_at || 'Z'
WHERE scheduled_at IS NOT NULL AND scheduled_at NOT LIKE '%Z';

UPDATE emissions 
SET emitted_at = emitted_at || 'Z'
WHERE emitted_at IS NOT NULL AND emitted_at NOT LIKE '%Z';

UPDATE emissions 
SET confirmed_at = confirmed_at || 'Z'
WHERE confirmed_at IS NOT NULL AND confirmed_at NOT LIKE '%Z';
