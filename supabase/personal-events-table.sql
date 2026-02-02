-- Personal events table for user personal events
-- Run this SQL in Supabase SQL editor

-- Create personal_events table
CREATE TABLE IF NOT EXISTS public.personal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.personal_events ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_personal_events_user_id ON public.personal_events(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_events_start_time ON public.personal_events(start_time);
CREATE INDEX IF NOT EXISTS idx_personal_events_user_start ON public.personal_events(user_id, start_time);

-- RLS Policies

-- Users can only see their own personal events
CREATE POLICY "Users can view own personal events"
  ON public.personal_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own personal events
CREATE POLICY "Users can insert own personal events"
  ON public.personal_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own personal events
CREATE POLICY "Users can update own personal events"
  ON public.personal_events
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own personal events
CREATE POLICY "Users can delete own personal events"
  ON public.personal_events
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_personal_events_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_personal_events_updated_at
  BEFORE UPDATE ON public.personal_events
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_events_updated_at_column();
