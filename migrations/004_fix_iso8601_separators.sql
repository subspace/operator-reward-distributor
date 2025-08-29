-- Fix existing timestamps to valid ISO 8601 format with 'T' separator and 'Z' suffix
-- Idempotent: safe to run multiple times

-- Handle timestamps that already have a 'Z' but use a space between date and time
UPDATE emissions 
SET scheduled_at = REPLACE(scheduled_at, ' ', 'T')
WHERE scheduled_at IS NOT NULL AND scheduled_at LIKE '% %Z';

UPDATE emissions 
SET emitted_at = REPLACE(emitted_at, ' ', 'T')
WHERE emitted_at IS NOT NULL AND emitted_at LIKE '% %Z';

UPDATE emissions 
SET confirmed_at = REPLACE(confirmed_at, ' ', 'T')
WHERE confirmed_at IS NOT NULL AND confirmed_at LIKE '% %Z';

-- Handle timestamps without 'Z' suffix (and ensure 'T' separator)
UPDATE emissions 
SET scheduled_at = REPLACE(scheduled_at, ' ', 'T') || 'Z'
WHERE scheduled_at IS NOT NULL AND scheduled_at NOT LIKE '%Z';

UPDATE emissions 
SET emitted_at = REPLACE(emitted_at, ' ', 'T') || 'Z'
WHERE emitted_at IS NOT NULL AND emitted_at NOT LIKE '%Z';

UPDATE emissions 
SET confirmed_at = REPLACE(confirmed_at, ' ', 'T') || 'Z'
WHERE confirmed_at IS NOT NULL AND confirmed_at NOT LIKE '%Z';


