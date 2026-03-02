-- ================================
-- Calendar invites + viewer-only members
-- Simple sharing model:
--   - Owner can invite by email
--   - Recipient must sign up/login and accept invite
--   - Members can view events + comment, but cannot edit events
--   - Members can leave; owner can remove members
-- ================================

-- 1) Calendar invites
CREATE TABLE IF NOT EXISTS public.calendar_invites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  calendar_id UUID REFERENCES public.calendars(id) ON DELETE CASCADE NOT NULL,
  invited_email TEXT NOT NULL,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending','accepted','revoked','expired')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days') NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_invites_calendar_id ON public.calendar_invites(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_invites_invited_email ON public.calendar_invites(invited_email);
CREATE INDEX IF NOT EXISTS idx_calendar_invites_status ON public.calendar_invites(status);

ALTER TABLE public.calendar_invites ENABLE ROW LEVEL SECURITY;

-- Owner (or members) can see invites for calendars they belong to; typically only owners will use it.
CREATE POLICY IF NOT EXISTS "calendar_invites_select_calendar_members" ON public.calendar_invites
  FOR SELECT USING (
    calendar_id IN (
      SELECT calendar_id FROM public.calendar_members WHERE user_id = auth.uid()
    )
  );

-- Invited user can see their own pending invites (matched by profiles.email)
CREATE POLICY IF NOT EXISTS "calendar_invites_select_by_email" ON public.calendar_invites
  FOR SELECT USING (
    status = 'pending'
    AND invited_email = (
      SELECT email FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Only owner can create invites
CREATE POLICY IF NOT EXISTS "calendar_invites_insert_owner" ON public.calendar_invites
  FOR INSERT WITH CHECK (
    calendar_id IN (
      SELECT calendar_id FROM public.calendar_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
    AND invited_by = auth.uid()
  );

-- Only owner can revoke/expire (updates)
CREATE POLICY IF NOT EXISTS "calendar_invites_update_owner" ON public.calendar_invites
  FOR UPDATE USING (
    calendar_id IN (
      SELECT calendar_id FROM public.calendar_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Only owner can delete invites
CREATE POLICY IF NOT EXISTS "calendar_invites_delete_owner" ON public.calendar_invites
  FOR DELETE USING (
    calendar_id IN (
      SELECT calendar_id FROM public.calendar_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- 2) Accept invite (Security Definer) to keep RLS simple
-- This will:
--   - validate invite is pending & not expired
--   - validate invited_email matches current user's profile email
--   - add user as viewer (role='viewer')
--   - mark invite accepted
CREATE OR REPLACE FUNCTION public.accept_calendar_invite(invite_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_calendar_id UUID;
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No profile email for current user';
  END IF;

  SELECT calendar_id INTO v_calendar_id
  FROM public.calendar_invites
  WHERE id = invite_id
    AND status = 'pending'
    AND invited_email = v_email
    AND expires_at > NOW();

  IF v_calendar_id IS NULL THEN
    RAISE EXCEPTION 'Invite not found / not pending / expired / email mismatch';
  END IF;

  INSERT INTO public.calendar_members (calendar_id, user_id, role)
  VALUES (v_calendar_id, auth.uid(), 'viewer')
  ON CONFLICT (calendar_id, user_id) DO NOTHING;

  UPDATE public.calendar_invites
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = invite_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_calendar_invite(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_calendar_invite(UUID) TO authenticated;

-- 3) Viewer-only: tighten calendar_events policies
DO $$
BEGIN
  -- Drop old policies if they exist
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

-- Members can still SELECT events (existing policy cal_events_select remains)

-- Only owners can INSERT/UPDATE/DELETE events
CREATE POLICY IF NOT EXISTS "cal_events_insert_owner_only" ON public.calendar_events
  FOR INSERT WITH CHECK (
    calendar_id IN (
      SELECT calendar_id FROM public.calendar_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY IF NOT EXISTS "cal_events_update_owner_only" ON public.calendar_events
  FOR UPDATE USING (
    calendar_id IN (
      SELECT calendar_id FROM public.calendar_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY IF NOT EXISTS "cal_events_delete_owner_only" ON public.calendar_events
  FOR DELETE USING (
    calendar_id IN (
      SELECT calendar_id FROM public.calendar_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );
