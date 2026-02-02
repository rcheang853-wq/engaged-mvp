-- Database Functions and Triggers for Event Calendar App
-- Complex business logic, AI matching functions, and automation

-- ================================
-- AI MATCHING FUNCTIONS
-- ================================

-- Function to calculate user preference score for an event
CREATE OR REPLACE FUNCTION public.calculate_event_score(
    user_uuid UUID,
    event_uuid UUID
)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    user_prefs RECORD;
    event_data RECORD;
    category_match BOOLEAN := false;
    time_match BOOLEAN := false;
    price_match BOOLEAN := false;
    location_distance DECIMAL;
BEGIN
    -- Get user preferences
    SELECT
        preferred_categories,
        preferred_times,
        preferred_price_range,
        preferred_radius,
        city,
        ai_preferences
    INTO user_prefs
    FROM public.profiles
    WHERE id = user_uuid;

    -- Get event data with venue info
    SELECT
        e.*,
        v.city as venue_city,
        v.latitude,
        v.longitude,
        c.name as category_name
    INTO event_data
    FROM public.events e
    LEFT JOIN public.venues v ON v.id = e.venue_id
    LEFT JOIN public.event_categories c ON c.id = e.category_id
    WHERE e.id = event_uuid;

    -- Base score
    score := 50;

    -- Category matching (25 points)
    IF event_data.category_name = ANY(user_prefs.preferred_categories) THEN
        score := score + 25;
        category_match := true;
    END IF;

    -- Time preferences (20 points)
    IF EXTRACT(DOW FROM event_data.start_time) IN (0, 6) AND 'weekend' = ANY(user_prefs.preferred_times) THEN
        score := score + 15;
        time_match := true;
    ELSIF EXTRACT(HOUR FROM event_data.start_time) BETWEEN 6 AND 12 AND 'morning' = ANY(user_prefs.preferred_times) THEN
        score := score + 15;
        time_match := true;
    ELSIF EXTRACT(HOUR FROM event_data.start_time) BETWEEN 12 AND 18 AND 'afternoon' = ANY(user_prefs.preferred_times) THEN
        score := score + 15;
        time_match := true;
    ELSIF EXTRACT(HOUR FROM event_data.start_time) BETWEEN 18 AND 23 AND 'evening' = ANY(user_prefs.preferred_times) THEN
        score := score + 15;
        time_match := true;
    END IF;

    -- Price matching (15 points)
    IF event_data.is_free OR (
        event_data.price_range[1] >= user_prefs.preferred_price_range[1] AND
        event_data.price_range[2] <= user_prefs.preferred_price_range[2]
    ) THEN
        score := score + 15;
        price_match := true;
    END IF;

    -- Location proximity (20 points)
    IF user_prefs.city = event_data.venue_city THEN
        score := score + 20;
    END IF;

    -- Popularity boost (10 points max)
    score := score + LEAST(event_data.popularity_score / 10, 10);

    -- Quality boost (10 points max)
    score := score + LEAST(event_data.quality_score / 10, 10);

    -- Featured event boost
    IF event_data.is_featured THEN
        score := score + 5;
    END IF;

    -- Trending event boost
    IF event_data.is_trending THEN
        score := score + 5;
    END IF;

    -- Ensure score is within bounds
    score := GREATEST(0, LEAST(100, score));

    RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get personalized event recommendations
CREATE OR REPLACE FUNCTION public.get_user_recommendations(
    user_uuid UUID,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    event_id UUID,
    title TEXT,
    start_time TIMESTAMPTZ,
    venue_name TEXT,
    category_name TEXT,
    score INTEGER,
    poster_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH scored_events AS (
        SELECT
            e.id as event_id,
            e.title,
            e.start_time,
            v.name as venue_name,
            c.name as category_name,
            public.calculate_event_score(user_uuid, e.id) as score,
            e.poster_url
        FROM public.events e
        LEFT JOIN public.venues v ON v.id = e.venue_id
        LEFT JOIN public.event_categories c ON c.id = e.category_id
        WHERE e.status = 'published'
        AND e.start_time > NOW()
        AND NOT EXISTS (
            SELECT 1 FROM public.user_swipes us
            WHERE us.user_id = user_uuid AND us.event_id = e.id
        )
    )
    SELECT *
    FROM scored_events
    ORDER BY score DESC, start_time ASC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- EVENT MANAGEMENT FUNCTIONS
-- ================================

-- Function to check for event conflicts in user's calendar
CREATE OR REPLACE FUNCTION public.check_event_conflicts(
    user_uuid UUID,
    event_start TIMESTAMPTZ,
    event_end TIMESTAMPTZ,
    exclude_event_id UUID DEFAULT NULL
)
RETURNS TABLE (
    conflicting_event_id UUID,
    conflicting_title TEXT,
    conflicting_start TIMESTAMPTZ,
    conflicting_end TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.title,
        e.start_time,
        e.end_time
    FROM public.user_events ue
    JOIN public.events e ON e.id = ue.event_id
    WHERE ue.user_id = user_uuid
    AND ue.save_type IN ('going', 'saved')
    AND (exclude_event_id IS NULL OR e.id != exclude_event_id)
    AND (
        (e.start_time <= event_start AND e.end_time > event_start) OR
        (e.start_time < event_end AND e.end_time >= event_end) OR
        (e.start_time >= event_start AND e.end_time <= event_end)
    )
    ORDER BY e.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update event popularity based on interactions
CREATE OR REPLACE FUNCTION public.update_event_popularity(event_uuid UUID)
RETURNS VOID AS $$
DECLARE
    total_interactions INTEGER;
    like_ratio DECIMAL;
    save_count INTEGER;
    new_popularity INTEGER;
BEGIN
    -- Count total swipes
    SELECT COUNT(*) INTO total_interactions
    FROM public.user_swipes
    WHERE event_id = event_uuid;

    -- Calculate like ratio
    SELECT
        CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE COUNT(*) FILTER (WHERE swipe_type IN ('like', 'superlike'))::DECIMAL / COUNT(*)
        END
    INTO like_ratio
    FROM public.user_swipes
    WHERE event_id = event_uuid;

    -- Count saves
    SELECT COUNT(*) INTO save_count
    FROM public.user_events
    WHERE event_id = event_uuid;

    -- Calculate new popularity score (0-100)
    new_popularity := LEAST(100,
        (total_interactions * 2) +
        (like_ratio * 30)::INTEGER +
        (save_count * 5)
    );

    -- Update event
    UPDATE public.events
    SET popularity_score = new_popularity
    WHERE id = event_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- MEMBERSHIP FUNCTIONS
-- ================================

-- Function to update user pro status based on subscription
CREATE OR REPLACE FUNCTION public.sync_user_pro_status(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
    active_subscription RECORD;
BEGIN
    -- Get active subscription
    SELECT *
    INTO active_subscription
    FROM public.subscriptions
    WHERE user_id = user_uuid
    AND status = 'active'
    AND current_period_end > NOW()
    ORDER BY current_period_end DESC
    LIMIT 1;

    -- Update profile
    IF active_subscription.id IS NOT NULL THEN
        UPDATE public.profiles
        SET
            is_pro = true,
            pro_expires_at = active_subscription.current_period_end
        WHERE id = user_uuid;
    ELSE
        UPDATE public.profiles
        SET
            is_pro = false,
            pro_expires_at = NULL
        WHERE id = user_uuid;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- ANALYTICS FUNCTIONS
-- ================================

-- Function to update event analytics
CREATE OR REPLACE FUNCTION public.record_event_view(
    event_uuid UUID,
    user_uuid UUID DEFAULT NULL,
    traffic_source TEXT DEFAULT 'direct'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.event_analytics (event_id, date, views_count, traffic_sources)
    VALUES (
        event_uuid,
        CURRENT_DATE,
        1,
        jsonb_build_object(traffic_source, 1)
    )
    ON CONFLICT (event_id, date)
    DO UPDATE SET
        views_count = event_analytics.views_count + 1,
        traffic_sources = event_analytics.traffic_sources ||
            jsonb_build_object(
                traffic_source,
                COALESCE((event_analytics.traffic_sources->>traffic_source)::INTEGER, 0) + 1
            );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record user swipe and update analytics
CREATE OR REPLACE FUNCTION public.record_swipe_with_analytics(
    user_uuid UUID,
    event_uuid UUID,
    swipe_action TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Record the swipe
    INSERT INTO public.user_swipes (user_id, event_id, swipe_type)
    VALUES (user_uuid, event_uuid, swipe_action)
    ON CONFLICT (user_id, event_id)
    DO UPDATE SET
        swipe_type = EXCLUDED.swipe_type,
        created_at = NOW();

    -- Update event analytics
    INSERT INTO public.event_analytics (event_id, date, swipes_like, swipes_pass, swipes_superlike)
    VALUES (
        event_uuid,
        CURRENT_DATE,
        CASE WHEN swipe_action = 'like' THEN 1 ELSE 0 END,
        CASE WHEN swipe_action = 'pass' THEN 1 ELSE 0 END,
        CASE WHEN swipe_action = 'superlike' THEN 1 ELSE 0 END
    )
    ON CONFLICT (event_id, date)
    DO UPDATE SET
        swipes_like = event_analytics.swipes_like +
            CASE WHEN swipe_action = 'like' THEN 1 ELSE 0 END,
        swipes_pass = event_analytics.swipes_pass +
            CASE WHEN swipe_action = 'pass' THEN 1 ELSE 0 END,
        swipes_superlike = event_analytics.swipes_superlike +
            CASE WHEN swipe_action = 'superlike' THEN 1 ELSE 0 END;

    -- Update user usage
    PERFORM public.increment_user_usage(
        user_uuid,
        CASE WHEN swipe_action = 'superlike' THEN 'superlike' ELSE 'swipe' END
    );

    -- Update event popularity
    PERFORM public.update_event_popularity(event_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- TRIGGERS
-- ================================

-- Trigger to automatically update event popularity on swipes
CREATE OR REPLACE FUNCTION trigger_update_event_popularity()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.update_event_popularity(NEW.event_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_popularity_on_swipe
    AFTER INSERT OR UPDATE ON public.user_swipes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_event_popularity();

-- Trigger to update analytics on event saves
CREATE OR REPLACE FUNCTION trigger_update_event_saves()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment saves count
        INSERT INTO public.event_analytics (event_id, date, saves_count)
        VALUES (NEW.event_id, CURRENT_DATE, 1)
        ON CONFLICT (event_id, date)
        DO UPDATE SET saves_count = event_analytics.saves_count + 1;

        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement saves count
        INSERT INTO public.event_analytics (event_id, date, saves_count)
        VALUES (OLD.event_id, CURRENT_DATE, -1)
        ON CONFLICT (event_id, date)
        DO UPDATE SET saves_count = event_analytics.saves_count - 1;

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_saves_analytics
    AFTER INSERT OR DELETE ON public.user_events
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_event_saves();

-- Trigger to sync pro status when subscriptions change
CREATE OR REPLACE FUNCTION trigger_sync_pro_status()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.sync_user_pro_status(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_pro_status_on_subscription_change
    AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_pro_status();

-- ================================
-- UTILITY FUNCTIONS
-- ================================

-- Function to clean up old analytics data (keep last 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_analytics()
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.event_analytics
    WHERE date < CURRENT_DATE - INTERVAL '90 days';

    DELETE FROM public.user_analytics
    WHERE date < CURRENT_DATE - INTERVAL '90 days';

    DELETE FROM public.user_usage
    WHERE date < CURRENT_DATE - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trending events (based on recent activity)
CREATE OR REPLACE FUNCTION public.get_trending_events(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    event_id UUID,
    title TEXT,
    start_time TIMESTAMPTZ,
    venue_name TEXT,
    poster_url TEXT,
    trend_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH recent_activity AS (
        SELECT
            ea.event_id,
            SUM(ea.views_count) as total_views,
            SUM(ea.swipes_like + ea.swipes_superlike) as total_likes,
            SUM(ea.saves_count) as total_saves
        FROM public.event_analytics ea
        WHERE ea.date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY ea.event_id
    ),
    trending_scores AS (
        SELECT
            ra.event_id,
            ((ra.total_views * 1) + (ra.total_likes * 3) + (ra.total_saves * 5)) as trend_score
        FROM recent_activity ra
        WHERE ra.total_views > 0
    )
    SELECT
        e.id,
        e.title,
        e.start_time,
        v.name as venue_name,
        e.poster_url,
        ts.trend_score::INTEGER
    FROM trending_scores ts
    JOIN public.events e ON e.id = ts.event_id
    LEFT JOIN public.venues v ON v.id = e.venue_id
    WHERE e.status = 'published'
    AND e.start_time > NOW()
    ORDER BY ts.trend_score DESC, e.start_time ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;