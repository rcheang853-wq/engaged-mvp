-- Phase P2: private event categories + tags

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS category_main TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
