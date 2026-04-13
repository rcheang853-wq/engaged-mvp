-- Feature B: allow user-created calendar events to be discoverable in Discover feed
-- IMPORTANT: do NOT open raw table rows to anonymous SELECT. Discover exposure stays behind app APIs.

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS discoverable_by_others BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_calendar_events_discoverable_start
  ON public.calendar_events(start_at)
  WHERE discoverable_by_others = true;
