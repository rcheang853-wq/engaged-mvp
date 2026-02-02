-- Add public sharing to personal_events
-- Run this SQL in Supabase SQL editor

-- Add share columns
ALTER TABLE public.personal_events 
  ADD COLUMN IF NOT EXISTS share_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN DEFAULT false;

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_personal_events_share_slug 
  ON public.personal_events(share_slug) 
  WHERE share_slug IS NOT NULL;

-- Function to generate random share slug (8 chars, URL-safe)
CREATE OR REPLACE FUNCTION generate_share_slug()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  slug TEXT := '';
  i INT;
  max_attempts INT := 10;
  attempt INT := 0;
BEGIN
  WHILE attempt < max_attempts LOOP
    slug := '';
    FOR i IN 1..8 LOOP
      slug := slug || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
    END LOOP;
    
    -- Check if slug already exists
    IF NOT EXISTS (SELECT 1 FROM public.personal_events WHERE share_slug = slug) THEN
      RETURN slug;
    END IF;
    
    attempt := attempt + 1;
  END LOOP;
  
  -- Fallback to UUID if all attempts failed
  RETURN substring(gen_random_uuid()::TEXT, 1, 8);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate share_slug when share_enabled is set to true
CREATE OR REPLACE FUNCTION auto_generate_share_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_enabled = true AND NEW.share_slug IS NULL THEN
    NEW.share_slug := generate_share_slug();
  END IF;
  
  IF NEW.share_enabled = false THEN
    NEW.share_slug := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_share_slug
  BEFORE INSERT OR UPDATE ON public.personal_events
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_share_slug();

-- RLS Policy for public access to shared events
CREATE POLICY "Anyone can view shared personal events"
  ON public.personal_events
  FOR SELECT
  USING (share_enabled = true AND share_slug IS NOT NULL);
