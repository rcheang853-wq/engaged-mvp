-- Make end_time nullable for scraped events
-- Some events don't have explicit end times

ALTER TABLE public.events
ALTER COLUMN end_time DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN public.events.end_time IS 'Event end time. Nullable for events without explicit end times (e.g., scraped events).';
