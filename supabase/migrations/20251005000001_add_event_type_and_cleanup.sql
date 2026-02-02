-- Migration: Add event_type column and mark invalid events
-- Created: 2025-10-05
-- Purpose: Add event classification and clean up invalid/navigation events

-- ================================
-- STEP 1: Add event_type column if it doesn't exist
-- ================================

DO $$
BEGIN
    -- Check if column exists, if not add it
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'events'
        AND column_name = 'event_type'
    ) THEN
        ALTER TABLE public.events
        ADD COLUMN event_type TEXT DEFAULT 'event'
        CHECK (event_type IN ('event', 'attraction', 'invalid'));

        RAISE NOTICE 'Added event_type column to events table';
    ELSE
        RAISE NOTICE 'event_type column already exists';
    END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_event_type ON public.events(event_type);

-- ================================
-- STEP 2: Create dry-run view to preview what will be marked invalid
-- ================================

CREATE OR REPLACE VIEW invalid_events_preview AS
SELECT
    id,
    title,
    description,
    start_time,
    venue_id,
    custom_location,
    event_type,
    CASE
        -- Navigation and menu patterns
        WHEN title ~* '^(home|menu|navigation|contact|about\s*us?|services|browse\s*events|all\s*events|view\s*all|more\s*events|upcoming|past\s*events|calendar|search|filter|categories|sign\s*(in|up)|log\s*(in|out)|(my\s*)?account|cart|checkout|wishlist|favorites)$'
            THEN 'Navigation/Menu Pattern'

        -- Title too short
        WHEN LENGTH(TRIM(title)) < 10
            THEN 'Title Too Short (<10 chars)'

        -- Missing description
        WHEN description IS NULL OR LENGTH(TRIM(description)) < 50
            THEN 'Missing or Short Description (<50 chars)'

        -- Missing venue/location
        WHEN venue_id IS NULL AND (custom_location IS NULL OR LENGTH(TRIM(custom_location)) = 0)
            THEN 'Missing Venue/Location'

        -- Suspicious patterns: all caps (but allow short acronyms)
        WHEN LENGTH(title) > 5 AND title = UPPER(title) AND title ~ '[A-Z]{6,}'
            THEN 'Suspicious Pattern: All Caps'

        -- Suspicious patterns: repeated characters
        WHEN title ~ '(.)\1{5,}'
            THEN 'Suspicious Pattern: Repeated Characters'

        ELSE NULL
    END AS invalid_reason
FROM public.events
WHERE event_type != 'invalid'; -- Only check events not already marked

-- ================================
-- STEP 3: Create function to mark invalid events
-- ================================

CREATE OR REPLACE FUNCTION mark_invalid_events(dry_run BOOLEAN DEFAULT TRUE)
RETURNS TABLE (
    event_id UUID,
    event_title TEXT,
    reason TEXT,
    action TEXT
) AS $$
DECLARE
    event_record RECORD;
    total_marked INTEGER := 0;
    dry_run_text TEXT;
BEGIN
    -- Set dry run indicator
    dry_run_text := CASE WHEN dry_run THEN '[DRY RUN] ' ELSE '' END;

    RAISE NOTICE '%Starting invalid event marking process...', dry_run_text;

    FOR event_record IN
        SELECT * FROM invalid_events_preview WHERE invalid_reason IS NOT NULL
    LOOP
        -- Return the event details
        event_id := event_record.id;
        event_title := event_record.title;
        reason := event_record.invalid_reason;
        action := CASE WHEN dry_run THEN 'Would Mark' ELSE 'Marked' END;

        RETURN NEXT;

        -- Only update if not dry run
        IF NOT dry_run THEN
            UPDATE public.events
            SET event_type = 'invalid'
            WHERE id = event_record.id;

            total_marked := total_marked + 1;
        END IF;
    END LOOP;

    RAISE NOTICE '%Total events processed: %', dry_run_text, total_marked;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- STEP 4: Create function to get invalid event statistics
-- ================================

CREATE OR REPLACE FUNCTION get_invalid_event_stats()
RETURNS TABLE (
    reason TEXT,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        invalid_reason AS reason,
        COUNT(*) AS count
    FROM invalid_events_preview
    WHERE invalid_reason IS NOT NULL
    GROUP BY invalid_reason
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- STEP 5: Add comments for documentation
-- ================================

COMMENT ON COLUMN public.events.event_type IS 'Event classification: event (time-bound), attraction (permanent), or invalid (navigation/menu)';
COMMENT ON VIEW invalid_events_preview IS 'Preview of events that would be marked invalid based on validation rules';
COMMENT ON FUNCTION mark_invalid_events IS 'Mark invalid events. Use dry_run=true to preview, dry_run=false to execute';
COMMENT ON FUNCTION get_invalid_event_stats IS 'Get statistics on invalid events by rejection reason';

-- ================================
-- STEP 6: Display preview statistics
-- ================================

DO $$
DECLARE
    stat_record RECORD;
    total_invalid INTEGER;
BEGIN
    RAISE NOTICE '=== Invalid Events Preview Statistics ===';

    SELECT COUNT(*) INTO total_invalid
    FROM invalid_events_preview
    WHERE invalid_reason IS NOT NULL;

    RAISE NOTICE 'Total events to be marked invalid: %', total_invalid;
    RAISE NOTICE '';
    RAISE NOTICE 'Breakdown by reason:';

    FOR stat_record IN
        SELECT * FROM get_invalid_event_stats()
    LOOP
        RAISE NOTICE '  - %: %', stat_record.reason, stat_record.count;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'To see details: SELECT * FROM invalid_events_preview WHERE invalid_reason IS NOT NULL;';
    RAISE NOTICE 'To mark as invalid: SELECT * FROM mark_invalid_events(false);';
    RAISE NOTICE 'For dry run: SELECT * FROM mark_invalid_events(true);';
    RAISE NOTICE '=========================================';
END $$;
