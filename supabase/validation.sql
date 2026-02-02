-- Schema Validation Script for Event Calendar App
-- Run this after applying all migrations to validate schema integrity

-- ================================
-- TABLE EXISTENCE VALIDATION
-- ================================

DO $$
DECLARE
    expected_tables TEXT[] := ARRAY[
        'profiles', 'event_categories', 'venues', 'organizers', 'events',
        'user_swipes', 'user_events', 'subscriptions', 'payments', 'user_usage',
        'event_sources', 'scrape_jobs', 'event_analytics', 'user_analytics'
    ];
    missing_tables TEXT[] := '{}';
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = table_name
        ) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;

    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE '✅ All expected tables exist';
    END IF;
END $$;

-- ================================
-- RLS VALIDATION
-- ================================

DO $$
DECLARE
    tables_without_rls INTEGER;
BEGIN
    SELECT COUNT(*) INTO tables_without_rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname IN (
        'profiles', 'event_categories', 'venues', 'organizers', 'events',
        'user_swipes', 'user_events', 'subscriptions', 'payments', 'user_usage',
        'event_sources', 'scrape_jobs', 'event_analytics', 'user_analytics'
    )
    AND NOT c.relrowsecurity;

    IF tables_without_rls > 0 THEN
        RAISE EXCEPTION 'Found % tables without RLS enabled', tables_without_rls;
    ELSE
        RAISE NOTICE '✅ RLS enabled on all tables';
    END IF;
END $$;

-- ================================
-- FUNCTION EXISTENCE VALIDATION
-- ================================

DO $$
DECLARE
    expected_functions TEXT[] := ARRAY[
        'calculate_event_score',
        'get_user_recommendations',
        'check_event_conflicts',
        'update_event_popularity',
        'sync_user_pro_status',
        'record_event_view',
        'record_swipe_with_analytics',
        'user_has_pro_subscription',
        'check_daily_swipe_limit',
        'increment_user_usage'
    ];
    missing_functions TEXT[] := '{}';
    func_name TEXT;
BEGIN
    FOREACH func_name IN ARRAY expected_functions
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = func_name
        ) THEN
            missing_functions := array_append(missing_functions, func_name);
        END IF;
    END LOOP;

    IF array_length(missing_functions, 1) > 0 THEN
        RAISE EXCEPTION 'Missing functions: %', array_to_string(missing_functions, ', ');
    ELSE
        RAISE NOTICE '✅ All expected functions exist';
    END IF;
END $$;

-- ================================
-- INDEX VALIDATION
-- ================================

DO $$
DECLARE
    critical_indexes TEXT[] := ARRAY[
        'idx_events_start_time',
        'idx_events_status',
        'idx_events_city_date',
        'idx_user_swipes_user_id',
        'idx_user_events_user_id',
        'idx_profiles_city'
    ];
    missing_indexes TEXT[] := '{}';
    index_name TEXT;
BEGIN
    FOREACH index_name IN ARRAY critical_indexes
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public' AND indexname = index_name
        ) THEN
            missing_indexes := array_append(missing_indexes, index_name);
        END IF;
    END LOOP;

    IF array_length(missing_indexes, 1) > 0 THEN
        RAISE EXCEPTION 'Missing critical indexes: %', array_to_string(missing_indexes, ', ');
    ELSE
        RAISE NOTICE '✅ All critical indexes exist';
    END IF;
END $$;

-- ================================
-- FOREIGN KEY VALIDATION
-- ================================

DO $$
DECLARE
    expected_fks INTEGER := 15; -- Approximate number of foreign keys
    actual_fks INTEGER;
BEGIN
    SELECT COUNT(*) INTO actual_fks
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND constraint_type = 'FOREIGN KEY';

    IF actual_fks < expected_fks THEN
        RAISE EXCEPTION 'Expected at least % foreign keys, found %', expected_fks, actual_fks;
    ELSE
        RAISE NOTICE '✅ Foreign key constraints validated (% found)', actual_fks;
    END IF;
END $$;

-- ================================
-- SEED DATA VALIDATION
-- ================================

DO $$
DECLARE
    category_count INTEGER;
    venue_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count FROM public.event_categories;
    SELECT COUNT(*) INTO venue_count FROM public.venues;

    IF category_count < 10 THEN
        RAISE EXCEPTION 'Expected at least 10 event categories, found %', category_count;
    END IF;

    IF venue_count < 10 THEN
        RAISE EXCEPTION 'Expected at least 10 venues, found %', venue_count;
    END IF;

    RAISE NOTICE '✅ Seed data validated (% categories, % venues)', category_count, venue_count;
END $$;

-- ================================
-- PERFORMANCE TEST QUERIES
-- ================================

-- Test AI recommendation function
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INTERVAL;
BEGIN
    start_time := clock_timestamp();

    PERFORM * FROM public.get_user_recommendations(test_user_id, 10, 0);

    end_time := clock_timestamp();
    duration := end_time - start_time;

    IF duration > interval '1 second' THEN
        RAISE WARNING 'AI recommendation query took %ms (expected <1000ms)', EXTRACT(milliseconds FROM duration);
    ELSE
        RAISE NOTICE '✅ AI recommendation performance: %ms', EXTRACT(milliseconds FROM duration);
    END IF;
END $$;

-- Test event conflict detection
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INTERVAL;
BEGIN
    start_time := clock_timestamp();

    PERFORM * FROM public.check_event_conflicts(
        test_user_id,
        NOW() + interval '1 day',
        NOW() + interval '1 day' + interval '3 hours'
    );

    end_time := clock_timestamp();
    duration := end_time - start_time;

    IF duration > interval '100 milliseconds' THEN
        RAISE WARNING 'Event conflict query took %ms (expected <100ms)', EXTRACT(milliseconds FROM duration);
    ELSE
        RAISE NOTICE '✅ Event conflict performance: %ms', EXTRACT(milliseconds FROM duration);
    END IF;
END $$;

-- ================================
-- FINAL VALIDATION SUMMARY
-- ================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 SCHEMA VALIDATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Database schema is ready for production use!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Configure Supabase project';
    RAISE NOTICE '2. Apply migrations to production';
    RAISE NOTICE '3. Set up authentication providers';
    RAISE NOTICE '4. Configure Stripe webhook endpoints';
    RAISE NOTICE '5. Set up monitoring and alerts';
    RAISE NOTICE '';
END $$;