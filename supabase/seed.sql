-- Supabase seed.sql file for development
-- This file is run after migrations to set up initial data for local development

-- Insert test user profiles (these will be created via auth.users in actual use)
-- For local testing, we'll use mock UUIDs

-- Example test data for development
INSERT INTO public.profiles (id, email, full_name, city, preferred_categories, is_pro) VALUES
    ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'Test User', 'Macau', ARRAY['music-concerts', 'arts-culture'], false),
    ('00000000-0000-0000-0000-000000000002', 'pro@example.com', 'Pro User', 'Hong Kong', ARRAY['business-networking', 'technology'], true)
ON CONFLICT (id) DO NOTHING;

-- Create sample organizers
INSERT INTO public.organizers (id, user_id, organization_name, contact_email, is_verified) VALUES
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'Macau Events Co.', 'contact@macauevents.com', true),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000002', 'HK Culture Group', 'info@hkculture.org', true)
ON CONFLICT DO NOTHING;

-- Create sample events for testing
WITH sample_categories AS (
    SELECT id as category_id, name FROM public.event_categories LIMIT 5
),
sample_venues AS (
    SELECT id as venue_id, name FROM public.venues LIMIT 5
),
sample_organizers AS (
    SELECT id as organizer_id FROM public.organizers LIMIT 2
)
INSERT INTO public.events (
    title,
    description,
    short_description,
    start_time,
    end_time,
    venue_id,
    organizer_id,
    category_id,
    is_free,
    price_range,
    status,
    poster_url,
    tags
)
SELECT
    'Sample Event ' || generate_series(1, 10),
    'This is a sample event description for testing purposes. It includes detailed information about what attendees can expect.',
    'Sample event for testing the platform',
    NOW() + (generate_series(1, 10) || ' days')::interval + '19:00:00'::time,
    NOW() + (generate_series(1, 10) || ' days')::interval + '22:00:00'::time,
    (SELECT venue_id FROM sample_venues ORDER BY random() LIMIT 1),
    (SELECT organizer_id FROM sample_organizers ORDER BY random() LIMIT 1),
    (SELECT category_id FROM sample_categories ORDER BY random() LIMIT 1),
    CASE WHEN random() > 0.3 THEN true ELSE false END,
    CASE WHEN random() > 0.3 THEN ARRAY[0, 0] ELSE ARRAY[50, 200] END,
    'published',
    'https://via.placeholder.com/400x300?text=Event+' || generate_series(1, 10),
    ARRAY['sample', 'test', 'development']
FROM generate_series(1, 10);

-- Set up some sample user interactions for testing AI matching
INSERT INTO public.user_swipes (user_id, event_id, swipe_type)
SELECT
    '00000000-0000-0000-0000-000000000001',
    e.id,
    CASE
        WHEN random() > 0.7 THEN 'like'
        WHEN random() > 0.9 THEN 'superlike'
        ELSE 'pass'
    END
FROM public.events e
WHERE e.status = 'published'
LIMIT 5;

-- Add some saved events
INSERT INTO public.user_events (user_id, event_id, save_type)
SELECT
    '00000000-0000-0000-0000-000000000001',
    e.id,
    'saved'
FROM public.events e
WHERE e.status = 'published'
LIMIT 3;

-- Initialize usage tracking
INSERT INTO public.user_usage (user_id, date, swipes_count, superlikes_count)
VALUES
    ('00000000-0000-0000-0000-000000000001', CURRENT_DATE, 15, 2),
    ('00000000-0000-0000-0000-000000000002', CURRENT_DATE, 5, 0);

-- Create sample analytics data
INSERT INTO public.event_analytics (event_id, date, views_count, saves_count, swipes_like, swipes_pass)
SELECT
    e.id,
    CURRENT_DATE - (random() * 7)::integer,
    (random() * 100)::integer,
    (random() * 20)::integer,
    (random() * 30)::integer,
    (random() * 15)::integer
FROM public.events e
WHERE e.status = 'published';

-- Update popularity scores based on sample data
SELECT public.update_event_popularity(e.id)
FROM public.events e
WHERE e.status = 'published';

-- Mark some events as trending
UPDATE public.events
SET is_trending = true
WHERE id IN (
    SELECT id FROM public.events
    WHERE status = 'published'
    ORDER BY popularity_score DESC
    LIMIT 3
);

-- Set some events as featured
UPDATE public.events
SET is_featured = true
WHERE id IN (
    SELECT id FROM public.events
    WHERE status = 'published'
    ORDER BY random()
    LIMIT 2
);