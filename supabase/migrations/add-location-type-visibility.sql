-- Add location_type and visibility to personal_events
-- Migration: add-location-type-visibility
-- Created: 2026-02-04

-- Add location_type column (None, Plain Text, Google Maps)
ALTER TABLE public.personal_events 
  ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'none'
  CHECK (location_type IN ('none', 'text', 'maps'));

-- Add visibility column (Public, Private, Invite Only)
ALTER TABLE public.personal_events 
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private'
  CHECK (visibility IN ('public', 'private', 'invite_only'));

-- Add max_attendees column for capacity tracking
ALTER TABLE public.personal_events 
  ADD COLUMN IF NOT EXISTS max_attendees INTEGER;

-- Create index for visibility queries
CREATE INDEX IF NOT EXISTS idx_personal_events_visibility 
  ON public.personal_events(visibility);

-- Update existing events to use new schema defaults
-- Set location_type based on existing location data
UPDATE public.personal_events 
SET location_type = CASE 
  WHEN location IS NOT NULL AND location != '' THEN 'text'
  ELSE 'none'
END
WHERE location_type = 'none';

-- Migrate share_enabled to visibility
UPDATE public.personal_events 
SET visibility = CASE 
  WHEN share_enabled = true THEN 'public'
  ELSE 'private'
END
WHERE visibility = 'private';

-- Update RLS policy for new visibility model
DROP POLICY IF EXISTS "Anyone can view shared personal events" ON public.personal_events;

CREATE POLICY "Public events are viewable by anyone"
  ON public.personal_events
  FOR SELECT
  USING (visibility = 'public' AND share_slug IS NOT NULL);

-- Note: Invite Only requires attendee tracking (Phase 5)
-- For now, treat as private with share capability
