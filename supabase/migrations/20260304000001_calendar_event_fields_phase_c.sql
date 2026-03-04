-- Phase C: extra calendar_events fields

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS url TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER;

-- Optional: basic sanity check
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='calendar_events' AND column_name='reminder_minutes'
  ) THEN
    -- no-op
  END IF;
END $$;
