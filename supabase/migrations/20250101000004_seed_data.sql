-- Seed Data for Event Calendar App
-- Initial categories, venues, and sample data for testing and development

-- ================================
-- EVENT CATEGORIES
-- ================================

INSERT INTO public.event_categories (id, name, slug, description, icon, color, sort_order) VALUES
    (uuid_generate_v4(), 'Music & Concerts', 'music-concerts', 'Live music performances, concerts, and musical events', '🎵', '#E11D48', 1),
    (uuid_generate_v4(), 'Arts & Culture', 'arts-culture', 'Art exhibitions, cultural events, and creative workshops', '🎨', '#7C3AED', 2),
    (uuid_generate_v4(), 'Food & Dining', 'food-dining', 'Food festivals, wine tastings, and culinary experiences', '🍽️', '#EA580C', 3),
    (uuid_generate_v4(), 'Sports & Fitness', 'sports-fitness', 'Sports events, fitness classes, and active activities', '⚽', '#059669', 4),
    (uuid_generate_v4(), 'Business & Networking', 'business-networking', 'Professional events, conferences, and networking opportunities', '💼', '#0284C7', 5),
    (uuid_generate_v4(), 'Technology', 'technology', 'Tech meetups, workshops, and innovation events', '💻', '#4F46E5', 6),
    (uuid_generate_v4(), 'Family & Kids', 'family-kids', 'Family-friendly events and activities for children', '👨‍👩‍👧‍👦', '#DC2626', 7),
    (uuid_generate_v4(), 'Nightlife & Parties', 'nightlife-parties', 'Clubs, parties, and evening entertainment', '🌙', '#7C2D12', 8),
    (uuid_generate_v4(), 'Health & Wellness', 'health-wellness', 'Wellness workshops, meditation, and health-focused events', '🧘', '#16A34A', 9),
    (uuid_generate_v4(), 'Education & Learning', 'education-learning', 'Workshops, seminars, and educational events', '📚', '#0F766E', 10),
    (uuid_generate_v4(), 'Fashion & Beauty', 'fashion-beauty', 'Fashion shows, beauty events, and style workshops', '💄', '#BE185D', 11),
    (uuid_generate_v4(), 'Travel & Tourism', 'travel-tourism', 'Travel events, cultural tours, and exploration activities', '✈️', '#0369A1', 12),
    (uuid_generate_v4(), 'Community & Social', 'community-social', 'Community gatherings, social events, and volunteer activities', '🤝', '#65A30D', 13),
    (uuid_generate_v4(), 'Gaming & Esports', 'gaming-esports', 'Gaming tournaments, esports events, and gaming communities', '🎮', '#6366F1', 14),
    (uuid_generate_v4(), 'Film & Entertainment', 'film-entertainment', 'Movie screenings, theater, and entertainment shows', '🎬', '#8B5CF6', 15);

-- ================================
-- VENUES (Macau/Hong Kong)
-- ================================

-- Macau Venues
INSERT INTO public.venues (id, name, slug, address, city, latitude, longitude, website_url, capacity, venue_type, is_verified) VALUES
    (uuid_generate_v4(), 'Venetian Macao Resort Hotel', 'venetian-macao', 'Estrada da Baía de Nossa Senhora da Esperança, s/n, Taipa, Macao', 'Macau', 22.1438, 113.5640, 'https://www.venetianmacao.com', 15000, 'resort', true),
    (uuid_generate_v4(), 'City of Dreams', 'city-of-dreams', 'Estrada do Istmo, Cotai, Macao', 'Macau', 22.1515, 113.5593, 'https://www.cityofdreamsmacau.com', 2000, 'casino_resort', true),
    (uuid_generate_v4(), 'Macau Cultural Centre', 'macau-cultural-centre', 'Av. Xian Xing Hai, NAPE, Macao', 'Macau', 22.1987, 113.5516, 'https://www.ccm.gov.mo', 1200, 'cultural_center', true),
    (uuid_generate_v4(), 'Galaxy Macau', 'galaxy-macau', 'Estrada da Baía de Nossa Senhora da Esperança, Cotai, Macao', 'Macau', 22.1458, 113.5621, 'https://www.galaxymacau.com', 3000, 'casino_resort', true),
    (uuid_generate_v4(), 'Taipa Houses Museum', 'taipa-houses-museum', 'Av. da Carvalho, Taipa, Macao', 'Macau', 22.1571, 113.5517, 'https://www.icm.gov.mo', 200, 'museum', true),
    (uuid_generate_v4(), 'Senado Square', 'senado-square', 'Largo do Senado, Macao', 'Macau', 22.1932, 113.5388, null, 5000, 'public_square', true),
    (uuid_generate_v4(), 'MGM Macau', 'mgm-macau', 'Av. Dr. Sun Yat Sen, NAPE, Macao', 'Macau', 22.1901, 113.5481, 'https://www.mgm.mo', 1500, 'casino_resort', true),
    (uuid_generate_v4(), 'Wynn Palace', 'wynn-palace', 'Rua Cidade de Sintra, NAPE, Cotai, Macao', 'Macau', 22.1493, 113.5587, 'https://www.wynnpalace.com', 2500, 'casino_resort', true);

-- Hong Kong Venues
INSERT INTO public.venues (id, name, slug, address, city, latitude, longitude, website_url, capacity, venue_type, is_verified) VALUES
    (uuid_generate_v4(), 'Hong Kong Convention and Exhibition Centre', 'hkcec', '1 Expo Dr, Wan Chai, Hong Kong', 'Hong Kong', 22.2830, 114.1737, 'https://www.hkcec.com', 7000, 'convention_center', true),
    (uuid_generate_v4(), 'Central Library', 'central-library-hk', '66 Causeway Rd, Causeway Bay, Hong Kong', 'Hong Kong', 22.2800, 114.1859, 'https://www.hkpl.gov.hk', 300, 'library', true),
    (uuid_generate_v4(), 'Hong Kong Space Museum', 'hk-space-museum', '10 Salisbury Rd, Tsim Sha Tsui, Kowloon, Hong Kong', 'Hong Kong', 22.2942, 114.1722, 'https://www.lcsd.gov.hk', 300, 'museum', true),
    (uuid_generate_v4(), 'International Commerce Centre', 'icc-hk', '1 Austin Rd W, Tsim Sha Tsui, Kowloon, Hong Kong', 'Hong Kong', 22.3028, 114.1608, null, 1000, 'office_building', true),
    (uuid_generate_v4(), 'Hong Kong Cultural Centre', 'hk-cultural-centre', '10 Salisbury Rd, Tsim Sha Tsui, Kowloon, Hong Kong', 'Hong Kong', 22.2945, 114.1722, 'https://www.lcsd.gov.hk', 2100, 'cultural_center', true),
    (uuid_generate_v4(), 'Ocean Park', 'ocean-park-hk', 'Ocean Park Rd, Aberdeen, Hong Kong', 'Hong Kong', 22.2461, 114.1764, 'https://www.oceanpark.com.hk', 35000, 'theme_park', true),
    (uuid_generate_v4(), 'AsiaWorld-Expo', 'asiaworld-expo', '1 Expo Dr, Chek Lap Kok, Hong Kong', 'Hong Kong', 22.3286, 113.9436, 'https://www.asiaworld-expo.com', 14000, 'expo_center', true),
    (uuid_generate_v4(), 'Lan Kwai Fong', 'lan-kwai-fong', 'Lan Kwai Fong, Central, Hong Kong', 'Hong Kong', 22.2815, 114.1555, null, 2000, 'entertainment_district', true);

-- ================================
-- EVENT SOURCES (for scraping pipeline)
-- ================================

INSERT INTO public.event_sources (id, name, base_url, source_type, scrape_config, scrape_frequency_hours, is_active) VALUES
    (uuid_generate_v4(), 'Eventbrite Macau', 'https://www.eventbrite.com/d/macau--macau/events/', 'website',
        '{"selectors": {"title": ".event-card__title", "date": ".event-card__date", "venue": ".event-card__venue"}, "pagination": true}'::jsonb,
        12, true),
    (uuid_generate_v4(), 'Timable Hong Kong', 'https://timable.com/en/hk/events/', 'website',
        '{"selectors": {"title": ".event-title", "date": ".event-date", "venue": ".event-venue"}, "pagination": true}'::jsonb,
        6, true),
    (uuid_generate_v4(), 'Facebook Events Macau', 'https://www.facebook.com/events/search/?q=macau', 'website',
        '{"selectors": {"title": "[data-testid=''event-title'']", "date": "[data-testid=''event-date'']"}, "auth_required": true}'::jsonb,
        24, true),
    (uuid_generate_v4(), 'Venetian Macao Events', 'https://www.venetianmacao.com/entertainment/events.html', 'website',
        '{"selectors": {"title": ".event-title", "date": ".event-date"}, "pagination": false}'::jsonb,
        24, true),
    (uuid_generate_v4(), 'Hong Kong Tourism Board', 'https://www.discoverhongkong.com/us/see-do/events-festivals/', 'website',
        '{"selectors": {"title": ".event-name", "date": ".event-date", "venue": ".event-venue"}, "pagination": true}'::jsonb,
        12, true);

-- ================================
-- SAMPLE ORGANIZERS
-- ================================

-- Note: These will be created when actual users register and create organizer profiles
-- This is just for documentation purposes

-- ================================
-- UTILITY VIEWS
-- ================================

-- View for active events with venue and category info
CREATE VIEW public.active_events_view AS
SELECT
    e.id,
    e.title,
    e.description,
    e.short_description,
    e.start_time,
    e.end_time,
    e.is_free,
    e.price_range,
    e.poster_url,
    e.is_featured,
    e.is_trending,
    e.popularity_score,
    e.tags,
    v.name as venue_name,
    v.address as venue_address,
    v.city as venue_city,
    c.name as category_name,
    c.slug as category_slug,
    c.color as category_color,
    o.organization_name as organizer_name
FROM public.events e
LEFT JOIN public.venues v ON v.id = e.venue_id
LEFT JOIN public.event_categories c ON c.id = e.category_id
LEFT JOIN public.organizers o ON o.id = e.organizer_id
WHERE e.status = 'published'
AND e.start_time > NOW();

-- View for user's calendar events
CREATE VIEW public.user_calendar_view AS
SELECT
    ue.user_id,
    ue.save_type,
    ue.calendar_reminder,
    ue.reminder_minutes,
    ue.personal_notes,
    e.id as event_id,
    e.title,
    e.start_time,
    e.end_time,
    e.all_day,
    v.name as venue_name,
    v.address as venue_address,
    c.name as category_name,
    c.color as category_color
FROM public.user_events ue
JOIN public.events e ON e.id = ue.event_id
LEFT JOIN public.venues v ON v.id = e.venue_id
LEFT JOIN public.event_categories c ON c.id = e.category_id
WHERE e.status = 'published';

-- ================================
-- INITIAL CONFIGURATION
-- ================================

-- Set default values for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ================================
-- SCHEDULED FUNCTIONS (to be run via cron)
-- ================================

-- Function to update trending events (run daily)
CREATE OR REPLACE FUNCTION public.update_trending_events()
RETURNS VOID AS $$
BEGIN
    -- Reset all trending flags
    UPDATE public.events SET is_trending = false;

    -- Set trending flag for top events
    WITH trending_events AS (
        SELECT event_id
        FROM public.get_trending_events(20)
    )
    UPDATE public.events
    SET is_trending = true
    WHERE id IN (SELECT event_id FROM trending_events);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire pro memberships
CREATE OR REPLACE FUNCTION public.expire_pro_memberships()
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET is_pro = false, pro_expires_at = NULL
    WHERE is_pro = true
    AND pro_expires_at IS NOT NULL
    AND pro_expires_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;