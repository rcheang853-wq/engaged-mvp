-- Row Level Security (RLS) Policies for Event Calendar App
-- Ensures users can only access appropriate data based on authentication and permissions

-- ================================
-- ENABLE RLS ON ALL TABLES
-- ================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

-- ================================
-- PROFILES POLICIES
-- ================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (signup)
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can view public profiles
CREATE POLICY "Users can view public profiles" ON public.profiles
    FOR SELECT USING (is_public = true);

-- ================================
-- EVENT CATEGORIES POLICIES
-- ================================

-- All authenticated users can view active categories
CREATE POLICY "Authenticated users can view active categories" ON public.event_categories
    FOR SELECT TO authenticated USING (is_active = true);

-- ================================
-- VENUES POLICIES
-- ================================

-- All authenticated users can view venues
CREATE POLICY "Authenticated users can view venues" ON public.venues
    FOR SELECT TO authenticated USING (true);

-- Venue owners can update their venues (through organizer relationship)
CREATE POLICY "Organizers can update their venues" ON public.venues
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.organizers o
            WHERE o.user_id = auth.uid() AND o.id IN (
                SELECT e.organizer_id FROM public.events e WHERE e.venue_id = venues.id
            )
        )
    );

-- ================================
-- ORGANIZERS POLICIES
-- ================================

-- Users can view verified organizers
CREATE POLICY "Users can view verified organizers" ON public.organizers
    FOR SELECT USING (is_verified = true);

-- Users can view their own organizer profile
CREATE POLICY "Users can view own organizer profile" ON public.organizers
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create organizer profile
CREATE POLICY "Users can create organizer profile" ON public.organizers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own organizer profile
CREATE POLICY "Users can update own organizer profile" ON public.organizers
    FOR UPDATE USING (auth.uid() = user_id);

-- ================================
-- EVENTS POLICIES
-- ================================

-- All users can view published events
CREATE POLICY "Anyone can view published events" ON public.events
    FOR SELECT USING (status = 'published');

-- Organizers can view their own events (all statuses)
CREATE POLICY "Organizers can view own events" ON public.events
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.organizers o
            WHERE o.user_id = auth.uid() AND o.id = events.organizer_id
        )
    );

-- Organizers can create events
CREATE POLICY "Organizers can create events" ON public.events
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organizers o
            WHERE o.user_id = auth.uid() AND o.id = events.organizer_id
        )
    );

-- Organizers can update their own events
CREATE POLICY "Organizers can update own events" ON public.events
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.organizers o
            WHERE o.user_id = auth.uid() AND o.id = events.organizer_id
        )
    );

-- ================================
-- USER SWIPES POLICIES
-- ================================

-- Users can view their own swipes
CREATE POLICY "Users can view own swipes" ON public.user_swipes
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own swipes
CREATE POLICY "Users can create own swipes" ON public.user_swipes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own swipes (for feedback)
CREATE POLICY "Users can update own swipes" ON public.user_swipes
    FOR UPDATE USING (auth.uid() = user_id);

-- ================================
-- USER EVENTS POLICIES
-- ================================

-- Users can view their own saved events
CREATE POLICY "Users can view own saved events" ON public.user_events
    FOR SELECT USING (auth.uid() = user_id);

-- Users can view public saved events
CREATE POLICY "Users can view public saved events" ON public.user_events
    FOR SELECT USING (is_public = true);

-- Users can create their own saved events
CREATE POLICY "Users can create own saved events" ON public.user_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved events
CREATE POLICY "Users can update own saved events" ON public.user_events
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own saved events
CREATE POLICY "Users can delete own saved events" ON public.user_events
    FOR DELETE USING (auth.uid() = user_id);

-- ================================
-- SUBSCRIPTIONS POLICIES
-- ================================

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- System can create subscriptions (via service role)
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================
-- PAYMENTS POLICIES
-- ================================

-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);

-- System can create payments (via service role)
CREATE POLICY "Service role can manage payments" ON public.payments
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================
-- USER USAGE POLICIES
-- ================================

-- Users can view their own usage
CREATE POLICY "Users can view own usage" ON public.user_usage
    FOR SELECT USING (auth.uid() = user_id);

-- System can manage usage tracking (via service role)
CREATE POLICY "Service role can manage usage" ON public.user_usage
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================
-- EVENT SOURCES POLICIES
-- ================================

-- Only service role can manage event sources (scraping system)
CREATE POLICY "Service role can manage event sources" ON public.event_sources
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================
-- SCRAPE JOBS POLICIES
-- ================================

-- Only service role can manage scrape jobs
CREATE POLICY "Service role can manage scrape jobs" ON public.scrape_jobs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================
-- ANALYTICS POLICIES
-- ================================

-- Event analytics: Organizers can view their own event analytics
CREATE POLICY "Organizers can view own event analytics" ON public.event_analytics
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.organizers o ON o.id = e.organizer_id
            WHERE o.user_id = auth.uid() AND e.id = event_analytics.event_id
        )
    );

-- Service role can manage all analytics
CREATE POLICY "Service role can manage event analytics" ON public.event_analytics
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- User analytics: Users can view their own analytics
CREATE POLICY "Users can view own analytics" ON public.user_analytics
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage user analytics
CREATE POLICY "Service role can manage user analytics" ON public.user_analytics
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================
-- HELPER FUNCTIONS FOR RLS
-- ================================

-- Function to check if user has pro subscription
CREATE OR REPLACE FUNCTION public.user_has_pro_subscription(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = user_uuid
        AND p.is_pro = true
        AND (p.pro_expires_at IS NULL OR p.pro_expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check daily swipe limit
CREATE OR REPLACE FUNCTION public.check_daily_swipe_limit(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    daily_swipes INTEGER;
    is_pro BOOLEAN;
BEGIN
    -- Check if user is pro
    SELECT user_has_pro_subscription(user_uuid) INTO is_pro;

    -- Get today's swipe count
    SELECT COALESCE(swipes_count, 0) INTO daily_swipes
    FROM public.user_usage
    WHERE user_id = user_uuid AND date = CURRENT_DATE;

    -- Pro users have unlimited swipes
    IF is_pro THEN
        RETURN true;
    END IF;

    -- Free users limited to 40 swipes per day
    RETURN daily_swipes < 40;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage counters
CREATE OR REPLACE FUNCTION public.increment_user_usage(
    user_uuid UUID,
    usage_type TEXT,
    increment_by INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_usage (user_id, date, swipes_count, superlikes_count, searches_count)
    VALUES (
        user_uuid,
        CURRENT_DATE,
        CASE WHEN usage_type = 'swipe' THEN increment_by ELSE 0 END,
        CASE WHEN usage_type = 'superlike' THEN increment_by ELSE 0 END,
        CASE WHEN usage_type = 'search' THEN increment_by ELSE 0 END
    )
    ON CONFLICT (user_id, date)
    DO UPDATE SET
        swipes_count = user_usage.swipes_count +
            CASE WHEN usage_type = 'swipe' THEN increment_by ELSE 0 END,
        superlikes_count = user_usage.superlikes_count +
            CASE WHEN usage_type = 'superlike' THEN increment_by ELSE 0 END,
        searches_count = user_usage.searches_count +
            CASE WHEN usage_type = 'search' THEN increment_by ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;