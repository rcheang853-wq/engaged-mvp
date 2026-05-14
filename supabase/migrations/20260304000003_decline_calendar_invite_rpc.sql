-- Phase E: allow invited users to decline an invite

CREATE OR REPLACE FUNCTION public.decline_calendar_invite(invite_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No profile email for current user';
  END IF;

  -- Validate invite belongs to user + is pending + not expired
  IF NOT EXISTS (
    SELECT 1
    FROM public.calendar_invites
    WHERE id = invite_id
      AND status = 'pending'
      AND invited_email = v_email
      AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'Invite not found / not pending / expired / email mismatch';
  END IF;

  -- Mark as revoked (used here as "declined" to stay within existing status enum)
  UPDATE public.calendar_invites
  SET status = 'revoked', revoked_at = NOW()
  WHERE id = invite_id;
END;
$$;

REVOKE ALL ON FUNCTION public.decline_calendar_invite(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decline_calendar_invite(UUID) TO authenticated;
