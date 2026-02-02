-- Test Events SQL
-- Use this to quickly populate the calendar with test events
-- Run this in Supabase Dashboard → SQL Editor AFTER creating event sources

-- Create a test event source (if not already created)
INSERT INTO event_sources (
  name,
  base_url,
  source_type,
  scrape_config,
  scrape_frequency_hours,
  is_active
) VALUES (
  'Manual Test Events',
  'https://test.example.com',
  'website',
  '{}'::jsonb,
  24,
  false
)
ON CONFLICT DO NOTHING
RETURNING id;

-- Insert test events for the next 7 days
-- Replace <source_id> with the ID from the query above or an existing source

DO $$
DECLARE
  source_id uuid;
  base_date timestamp;
  i integer;
BEGIN
  -- Get or create test source
  SELECT id INTO source_id FROM event_sources WHERE name = 'Manual Test Events' LIMIT 1;

  -- If no source found, use the first active source
  IF source_id IS NULL THEN
    SELECT id INTO source_id FROM event_sources WHERE is_active = true LIMIT 1;
  END IF;

  -- Set base date to today at noon
  base_date := date_trunc('day', CURRENT_TIMESTAMP) + interval '12 hours';

  -- Insert 14 test events over the next 7 days
  FOR i IN 0..13 LOOP
    INSERT INTO events (
      title,
      description,
      start_time,
      end_time,
      location,
      price,
      image_url,
      source_url,
      event_source_id,
      metadata
    ) VALUES (
      CASE
        WHEN i % 4 = 0 THEN 'Tech Meetup: ' || (i/4 + 1)::text
        WHEN i % 4 = 1 THEN 'Music Concert: Live Performance ' || (i/4 + 1)::text
        WHEN i % 4 = 2 THEN 'Art Exhibition: Gallery Opening ' || (i/4 + 1)::text
        ELSE 'Workshop: Skills Development ' || (i/4 + 1)::text
      END,
      CASE
        WHEN i % 4 = 0 THEN 'Join fellow tech enthusiasts for networking and discussion about the latest in technology and innovation.'
        WHEN i % 4 = 1 THEN 'Experience an unforgettable evening of live music featuring local and international artists.'
        WHEN i % 4 = 2 THEN 'Explore contemporary art from emerging artists in this exclusive gallery opening.'
        ELSE 'Hands-on workshop to develop practical skills and learn from industry experts.'
      END,
      base_date + (i * interval '12 hours'),
      base_date + (i * interval '12 hours') + interval '2 hours',
      CASE
        WHEN i % 3 = 0 THEN 'Shoreditch, London'
        WHEN i % 3 = 1 THEN 'Camden, London'
        ELSE 'South Bank, London'
      END,
      CASE
        WHEN i % 3 = 0 THEN 'Free'
        WHEN i % 3 = 1 THEN '£15.00'
        ELSE '£25.00'
      END,
      'https://via.placeholder.com/400x300?text=Event+' || i::text,
      'https://example.com/events/' || i::text,
      source_id,
      jsonb_build_object(
        'category', CASE
          WHEN i % 4 = 0 THEN 'technology'
          WHEN i % 4 = 1 THEN 'music'
          WHEN i % 4 = 2 THEN 'art'
          ELSE 'education'
        END,
        'capacity', 50 + (i * 10),
        'organizer', 'Test Organizer ' || (i % 3 + 1)::text
      )
    )
    ON CONFLICT (source_url) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Inserted test events successfully';
END $$;

-- Verify test events were created
SELECT
  id,
  title,
  start_time,
  end_time,
  location,
  price,
  created_at
FROM events
ORDER BY start_time ASC
LIMIT 15;

-- Check event count by date
SELECT
  DATE(start_time) as event_date,
  COUNT(*) as event_count
FROM events
WHERE start_time >= CURRENT_TIMESTAMP
GROUP BY DATE(start_time)
ORDER BY event_date;
