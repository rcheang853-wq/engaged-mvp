-- Initial database schema for Event Calendar App
-- Supports 50k events, 20k users with AI matching and Pro membership

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search optimization

-- ================================
-- CORE TABLES
-- ================================

-- User profiles with AI matching preferences
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Location preferences
    city TEXT DEFAULT 'Macau',
    preferred_radius INTEGER DEFAULT 50, -- km radius for nearby events

    -- AI matching preferences
    preferred_categories TEXT[] DEFAULT '{}',
    preferred_times TEXT[] DEFAULT '{}', -- morning, afternoon, evening, weekend
    preferred_price_range INTEGER[] DEFAULT '{0, 1000}', -- HKD range
    ai_preferences JSONB DEFAULT '{}', -- Dynamic preference scoring

    -- Pro membership
    is_pro BOOLEAN DEFAULT FALSE,
    pro_expires_at TIMESTAMPTZ,
    stripe_customer_id TEXT,

    -- App settings
    notification_preferences JSONB DEFAULT '{
        "new_events": true,
        "event_updates": true,
        "ai_matches": true,
        "membership": true
    }'::jsonb,

    -- Privacy settings
    is_public BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE
);

-- Event categories for organization and AI matching
CREATE TABLE public.event_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT, -- Icon name or emoji
    color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Venue information
CREATE TABLE public.venues (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Macau',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    website_url TEXT,
    contact_info JSONB DEFAULT '{}',
    capacity INTEGER,
    venue_type TEXT, -- theater, club, restaurant, outdoor, etc.
    amenities TEXT[] DEFAULT '{}',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Event organizers (separate from users for business accounts)
CREATE TABLE public.organizers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    website_url TEXT,
    social_links JSONB DEFAULT '{}',
    bio TEXT,
    logo_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_level TEXT DEFAULT 'basic', -- basic, verified, premium
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Core events table
CREATE TABLE public.events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    short_description TEXT, -- For cards and listings

    -- Timing
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    timezone TEXT DEFAULT 'Asia/Macau',
    all_day BOOLEAN DEFAULT FALSE,

    -- Location
    venue_id UUID REFERENCES public.venues(id),
    custom_location TEXT, -- For events without formal venue

    -- Organization
    organizer_id UUID REFERENCES public.organizers(id),
    category_id UUID REFERENCES public.event_categories(id),

    -- Content
    poster_url TEXT,
    gallery_urls TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',

    -- Pricing and tickets
    is_free BOOLEAN DEFAULT TRUE,
    price_range INTEGER[] DEFAULT '{0, 0}', -- [min, max] in HKD
    ticket_url TEXT,
    registration_required BOOLEAN DEFAULT FALSE,
    capacity INTEGER,

    -- AI matching metadata
    ai_score_factors JSONB DEFAULT '{}', -- Factors for AI scoring
    popularity_score INTEGER DEFAULT 0,
    quality_score INTEGER DEFAULT 0,

    -- Status and moderation
    status TEXT DEFAULT 'draft', -- draft, pending, published, cancelled, completed
    is_featured BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,

    -- Scraping metadata
    source_url TEXT,
    source_type TEXT, -- manual, scraped, api
    last_scraped_at TIMESTAMPTZ,
    scrape_hash TEXT, -- For deduplication

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    published_at TIMESTAMPTZ
);

-- ================================
-- INTERACTION TABLES
-- ================================

-- User swipe interactions for AI matching
CREATE TABLE public.user_swipes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    swipe_type TEXT NOT NULL, -- like, pass, superlike
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- AI feedback data
    feedback_score INTEGER DEFAULT 0, -- User rating after attending
    attended BOOLEAN,
    attended_at TIMESTAMPTZ,

    UNIQUE(user_id, event_id)
);

-- User saved events (calendar integration)
CREATE TABLE public.user_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    save_type TEXT DEFAULT 'saved', -- saved, going, interested, maybe

    -- Calendar integration
    calendar_reminder BOOLEAN DEFAULT TRUE,
    reminder_minutes INTEGER DEFAULT 60,
    personal_notes TEXT,

    -- Social features
    is_public BOOLEAN DEFAULT TRUE,
    invited_by UUID REFERENCES public.profiles(id),

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    UNIQUE(user_id, event_id)
);

-- ================================
-- MEMBERSHIP AND BILLING
-- ================================

-- Pro membership subscriptions
CREATE TABLE public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL, -- active, canceled, past_due, unpaid
    plan_type TEXT DEFAULT 'pro', -- pro (expandable for future plans)

    -- Billing
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,

    -- Pricing
    amount INTEGER NOT NULL, -- in cents (HKD)
    currency TEXT DEFAULT 'HKD',

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Payment history
CREATE TABLE public.payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    subscription_id UUID REFERENCES public.subscriptions(id),
    stripe_payment_intent_id TEXT UNIQUE NOT NULL,

    amount INTEGER NOT NULL, -- in cents
    currency TEXT DEFAULT 'HKD',
    status TEXT NOT NULL, -- succeeded, failed, pending, canceled

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Usage tracking for Pro features
CREATE TABLE public.user_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,

    -- Daily limits tracking
    swipes_count INTEGER DEFAULT 0,
    superlikes_count INTEGER DEFAULT 0,
    searches_count INTEGER DEFAULT 0,

    -- Pro feature usage
    advanced_filters_used INTEGER DEFAULT 0,
    early_alerts_sent INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    UNIQUE(user_id, date)
);

-- ================================
-- SCRAPING PIPELINE TABLES
-- ================================

-- Event sources for scraping pipeline
CREATE TABLE public.event_sources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    source_type TEXT NOT NULL, -- website, api, manual

    -- Scraping configuration
    scrape_config JSONB DEFAULT '{}',
    last_scraped_at TIMESTAMPTZ,
    next_scrape_at TIMESTAMPTZ,
    scrape_frequency_hours INTEGER DEFAULT 24,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Scraping job history and monitoring
CREATE TABLE public.scrape_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    source_id UUID REFERENCES public.event_sources(id) ON DELETE CASCADE,

    -- Job details
    status TEXT NOT NULL, -- running, completed, failed
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,

    -- Results
    events_found INTEGER DEFAULT 0,
    events_created INTEGER DEFAULT 0,
    events_updated INTEGER DEFAULT 0,
    events_skipped INTEGER DEFAULT 0,

    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Metadata
    job_metadata JSONB DEFAULT '{}'
);

-- ================================
-- ANALYTICS AND INSIGHTS
-- ================================

-- Event analytics for organizers and platform insights
CREATE TABLE public.event_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,

    -- Engagement metrics
    views_count INTEGER DEFAULT 0,
    saves_count INTEGER DEFAULT 0,
    swipes_like INTEGER DEFAULT 0,
    swipes_pass INTEGER DEFAULT 0,
    swipes_superlike INTEGER DEFAULT 0,

    -- Traffic sources
    traffic_sources JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    UNIQUE(event_id, date)
);

-- User behavior analytics (aggregated, privacy-safe)
CREATE TABLE public.user_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,

    -- Activity metrics
    events_viewed INTEGER DEFAULT 0,
    events_saved INTEGER DEFAULT 0,
    swipes_total INTEGER DEFAULT 0,
    swipes_like_rate DECIMAL(3,2) DEFAULT 0, -- Percentage

    -- Session data
    sessions_count INTEGER DEFAULT 0,
    total_session_time INTEGER DEFAULT 0, -- seconds

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    UNIQUE(user_id, date)
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

-- Profiles indexes
CREATE INDEX idx_profiles_city ON public.profiles(city);
CREATE INDEX idx_profiles_is_pro ON public.profiles(is_pro);
CREATE INDEX idx_profiles_email_verified ON public.profiles(email_verified);

-- Events indexes
CREATE INDEX idx_events_start_time ON public.events(start_time);
CREATE INDEX idx_events_category_id ON public.events(category_id);
CREATE INDEX idx_events_venue_id ON public.events(venue_id);
CREATE INDEX idx_events_organizer_id ON public.events(organizer_id);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_is_featured ON public.events(is_featured);
CREATE INDEX idx_events_is_trending ON public.events(is_trending);
CREATE INDEX idx_events_city_date ON public.events(start_time) WHERE status = 'published';
CREATE INDEX idx_events_text_search ON public.events USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Venues indexes
CREATE INDEX idx_venues_city ON public.venues(city);
CREATE INDEX idx_venues_location ON public.venues(latitude, longitude);
CREATE INDEX idx_venues_is_verified ON public.venues(is_verified);

-- User interactions indexes
CREATE INDEX idx_user_swipes_user_id ON public.user_swipes(user_id);
CREATE INDEX idx_user_swipes_event_id ON public.user_swipes(event_id);
CREATE INDEX idx_user_swipes_created_at ON public.user_swipes(created_at);
CREATE INDEX idx_user_events_user_id ON public.user_events(user_id);
CREATE INDEX idx_user_events_event_id ON public.user_events(event_id);

-- Subscriptions and billing indexes
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON public.subscriptions(current_period_end);

-- Usage tracking indexes
CREATE INDEX idx_user_usage_user_date ON public.user_usage(user_id, date);
CREATE INDEX idx_user_usage_date ON public.user_usage(date);

-- Analytics indexes
CREATE INDEX idx_event_analytics_event_date ON public.event_analytics(event_id, date);
CREATE INDEX idx_user_analytics_user_date ON public.user_analytics(user_id, date);

-- Scraping indexes
CREATE INDEX idx_event_sources_active ON public.event_sources(is_active);
CREATE INDEX idx_event_sources_next_scrape ON public.event_sources(next_scrape_at) WHERE is_active = true;
CREATE INDEX idx_scrape_jobs_status ON public.scrape_jobs(status);
CREATE INDEX idx_scrape_jobs_started_at ON public.scrape_jobs(started_at);

-- ================================
-- TRIGGERS FOR UPDATED_AT
-- ================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizers_updated_at BEFORE UPDATE ON public.organizers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_events_updated_at BEFORE UPDATE ON public.user_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_sources_updated_at BEFORE UPDATE ON public.event_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();