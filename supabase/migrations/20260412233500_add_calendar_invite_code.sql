-- Add invite_code for whole-calendar share links
ALTER TABLE public.calendars
  ADD COLUMN IF NOT EXISTS invite_code TEXT;

-- Ensure invite codes are unique when present
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendars_invite_code_unique
  ON public.calendars(invite_code)
  WHERE invite_code IS NOT NULL;
