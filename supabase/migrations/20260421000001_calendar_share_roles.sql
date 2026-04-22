-- Add configurable roles for share-link joins and email invites.

ALTER TABLE public.calendars
  ADD COLUMN IF NOT EXISTS default_join_role calendar_role DEFAULT 'viewer' NOT NULL,
  ADD CONSTRAINT calendars_default_join_role_check
    CHECK (default_join_role IN ('viewer', 'editor'));

ALTER TABLE public.calendar_invites
  ADD COLUMN IF NOT EXISTS role calendar_role DEFAULT 'viewer' NOT NULL,
  ADD CONSTRAINT calendar_invites_role_check
    CHECK (role IN ('viewer', 'editor'));

CREATE OR REPLACE FUNCTION public.accept_calendar_invite(invite_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_calendar_id UUID;
  v_email TEXT;
  v_role calendar_role;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No profile email for current user';
  END IF;

  SELECT calendar_id, role INTO v_calendar_id, v_role
  FROM public.calendar_invites
  WHERE id = invite_id
    AND status = 'pending'
    AND invited_email = v_email
    AND expires_at > NOW();

  IF v_calendar_id IS NULL THEN
    RAISE EXCEPTION 'Invite not found / not pending / expired / email mismatch';
  END IF;

  INSERT INTO public.calendar_members (calendar_id, user_id, role)
  VALUES (v_calendar_id, auth.uid(), v_role)
  ON CONFLICT (calendar_id, user_id) DO NOTHING;

  UPDATE public.calendar_invites
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = invite_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_calendar_invite(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_calendar_invite(UUID) TO authenticated;
