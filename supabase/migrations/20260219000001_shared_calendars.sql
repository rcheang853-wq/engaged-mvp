-- ================================
-- SHARED CALENDARS (TimetTree-style upgrade)
-- Adds: calendars, calendar_members, calendar_events, event_comments
-- ================================

-- 1. Calendars table
CREATE TABLE public.calendars (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Calendar roles enum + members table
CREATE TYPE calendar_role AS ENUM ('owner', 'editor', 'viewer');

CREATE TABLE public.calendar_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  calendar_id UUID REFERENCES public.calendars(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role calendar_role DEFAULT 'viewer' NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(calendar_id, user_id)
);

-- 3. Calendar events (tied to calendar_id, NOT user_id)
CREATE TABLE public.calendar_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  calendar_id UUID REFERENCES public.calendars(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  location TEXT,
  color TEXT,
  -- Optional: link to a scraped public event in your existing events table
  linked_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Event comments / activity feed
CREATE TABLE public.event_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  calendar_event_id UUID REFERENCES public.calendar_events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ================================
-- INDEXES
-- ================================
CREATE INDEX idx_calendars_created_by ON public.calendars(created_by);
CREATE INDEX idx_calendar_members_calendar ON public.calendar_members(calendar_id);
CREATE INDEX idx_calendar_members_user ON public.calendar_members(user_id);
CREATE INDEX idx_calendar_events_calendar ON public.calendar_events(calendar_id);
CREATE INDEX idx_calendar_events_start ON public.calendar_events(start_at);
CREATE INDEX idx_event_comments_event ON public.event_comments(calendar_event_id);
CREATE INDEX idx_event_comments_user ON public.event_comments(user_id);

-- ================================
-- TRIGGERS (reuses existing update_updated_at_column function)
-- ================================
CREATE TRIGGER update_calendars_updated_at
  BEFORE UPDATE ON public.calendars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_comments_updated_at
  BEFORE UPDATE ON public.event_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- AUTO-ADD CREATOR AS OWNER
-- When a calendar is created, insert the creator as owner automatically
-- ================================
CREATE OR REPLACE FUNCTION add_calendar_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.calendar_members (calendar_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_calendar_created
  AFTER INSERT ON public.calendars
  FOR EACH ROW EXECUTE FUNCTION add_calendar_creator_as_owner();

-- ================================
-- RLS POLICIES
-- ================================
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

-- CALENDARS
CREATE POLICY "calendars_select" ON public.calendars
  FOR SELECT USING (
    id IN (
      SELECT calendar_id FROM public.calendar_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "calendars_insert" ON public.calendars
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "calendars_update" ON public.calendars
  FOR UPDATE USING (
    id IN (
      SELECT calendar_id FROM public.calendar_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "calendars_delete" ON public.calendars
  FOR DELETE USING (
    id IN (
      SELECT calendar_id FROM public.calendar_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- CALENDAR MEMBERS
CREATE POLICY "members_select" ON public.calendar_members
  FOR SELECT USING (
    calendar_id IN (
      SELECT calendar_id FROM public.calendar_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "members_insert" ON public.calendar_members
  FOR INSERT WITH CHECK (
    calendar_id IN (
      SELECT calendar_id FROM public.calendar_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "members_update" ON public.calendar_members
  FOR UPDATE USING (
    calendar_id IN (
      SELECT calendar_id FROM public.calendar_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "members_delete" ON public.calendar_members
  FOR DELETE USING (
    calendar_id IN (
      SELECT calendar_id FROM public.calendar_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
    OR user_id = auth.uid() -- allow self-leave
  );

-- CALENDAR EVENTS
CREATE POLICY "cal_events_select" ON public.calendar_events
  FOR SELECT USING (
    calendar_id IN (
      SELECT calendar_id FROM public.calendar_members WHERE user_id = auth.uid()
    )
  );

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
  );

CREATE POLICY "cal_events_delete" ON public.calendar_events
  FOR DELETE USING (
    calendar_id IN (
      SELECT calendar_id FROM public.calendar_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- EVENT COMMENTS
CREATE POLICY "comments_select" ON public.event_comments
  FOR SELECT USING (
    calendar_event_id IN (
      SELECT ce.id FROM public.calendar_events ce
      JOIN public.calendar_members cm ON cm.calendar_id = ce.calendar_id
      WHERE cm.user_id = auth.uid()
    )
  );

CREATE POLICY "comments_insert" ON public.event_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND calendar_event_id IN (
      SELECT ce.id FROM public.calendar_events ce
      JOIN public.calendar_members cm ON cm.calendar_id = ce.calendar_id
      WHERE cm.user_id = auth.uid()
    )
  );

CREATE POLICY "comments_update" ON public.event_comments
  FOR UPDATE USING (user_id = auth.uid()); -- only own comments

CREATE POLICY "comments_delete" ON public.event_comments
  FOR DELETE USING (user_id = auth.uid()); -- only own comments
