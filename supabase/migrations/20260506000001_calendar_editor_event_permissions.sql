-- Allow calendar editors to manage events while preserving viewer read-only access.
-- The earlier viewer-only migration tightened writes to owner-only; this restores
-- the intended owner/editor write model used by calendar sharing roles.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events' AND policyname = 'cal_events_insert_owner_only') THEN
    EXECUTE 'DROP POLICY "cal_events_insert_owner_only" ON public.calendar_events';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events' AND policyname = 'cal_events_update_owner_only') THEN
    EXECUTE 'DROP POLICY "cal_events_update_owner_only" ON public.calendar_events';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events' AND policyname = 'cal_events_delete_owner_only') THEN
    EXECUTE 'DROP POLICY "cal_events_delete_owner_only" ON public.calendar_events';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events' AND policyname = 'cal_events_insert') THEN
    EXECUTE 'DROP POLICY "cal_events_insert" ON public.calendar_events';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events' AND policyname = 'cal_events_update') THEN
    EXECUTE 'DROP POLICY "cal_events_update" ON public.calendar_events';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events' AND policyname = 'cal_events_delete') THEN
    EXECUTE 'DROP POLICY "cal_events_delete" ON public.calendar_events';
  END IF;
END $$;

CREATE POLICY "cal_events_insert" ON public.calendar_events
  FOR INSERT WITH CHECK (
    calendar_id IN (
      SELECT calendar_id FROM public.calendar_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "cal_events_update" ON public.calendar_events
  FOR UPDATE USING (
    calendar_id IN (
      SELECT calendar_id FROM public.calendar_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    calendar_id IN (
      SELECT calendar_id FROM public.calendar_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "cal_events_delete" ON public.calendar_events
  FOR DELETE USING (
    calendar_id IN (
      SELECT calendar_id FROM public.calendar_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );
