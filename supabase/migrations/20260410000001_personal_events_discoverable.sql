-- Feature B: allow user-created personal events to be discoverable in Discover feed

ALTER TABLE public.personal_events
  ADD COLUMN IF NOT EXISTS discoverable_by_others BOOLEAN DEFAULT false;

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS discoverable_by_others BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_personal_events_discoverable_start
  ON public.personal_events(start_time)
  WHERE discoverable_by_others = true;

CREATE INDEX IF NOT EXISTS idx_calendar_events_discoverable_start
  ON public.calendar_events(start_at)
  WHERE discoverable_by_others = true;

DROP POLICY IF EXISTS "Anyone can view discoverable personal events" ON public.personal_events;
CREATE POLICY "Anyone can view discoverable personal events"
  ON public.personal_events
  FOR SELECT
  USING (discoverable_by_others = true);

DROP POLICY IF EXISTS "Anyone can view discoverable calendar events" ON public.calendar_events;
CREATE POLICY "Anyone can view discoverable calendar events"
  ON public.calendar_events
  FOR SELECT
  USING (discoverable_by_others = true);
