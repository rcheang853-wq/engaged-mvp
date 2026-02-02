-- Add 6 Macau Event Sources to Supabase
-- Run these INSERT statements in your Supabase SQL Editor

-- 1. MGTO City Events (0.5 req/sec)
INSERT INTO event_sources (
  name,
  base_url,
  source_type,
  scrape_config,
  scrape_frequency_hours,
  is_active,
  created_at,
  updated_at
) VALUES (
  'MGTO City Events',
  'https://www.macaotourism.gov.mo/en/events/calendar',
  'website',
  '{
    "selectors": {
      "title": ".event-title, .activity-title, h3, h2",
      "date": ".event-date, .activity-date, .date",
      "venue": ".event-venue, .activity-venue, .venue",
      "description": ".event-description, .activity-description, .description"
    },
    "pagination": true,
    "delay": 2000,
    "rateLimit": "0.5 req/sec"
  }',
  12,
  true,
  NOW(),
  NOW()
);

-- 2. The Londoner Macao Events (1 req/sec)
INSERT INTO event_sources (
  name,
  base_url,
  source_type,
  scrape_config,
  scrape_frequency_hours,
  is_active,
  created_at,
  updated_at
) VALUES (
  'The Londoner Macao Events',
  'https://www.londonermacao.com/en/entertainment/events',
  'website',
  '{
    "selectors": {
      "title": ".event-title, .event-name, h3, h2",
      "date": ".event-date, .date",
      "venue": ".event-venue, .venue",
      "description": ".event-description, .description"
    },
    "pagination": true,
    "delay": 1000,
    "rateLimit": "1 req/sec"
  }',
  12,
  true,
  NOW(),
  NOW()
);

-- 3. The Venetian Macao Entertainment (1 req/sec)
INSERT INTO event_sources (
  name,
  base_url,
  source_type,
  scrape_config,
  scrape_frequency_hours,
  is_active,
  created_at,
  updated_at
) VALUES (
  'The Venetian Macao Entertainment',
  'https://www.venetianmacao.com/entertainment/events.html',
  'website',
  '{
    "selectors": {
      "title": ".event-title, .show-title, h3, h2",
      "date": ".event-date, .show-date, .date",
      "venue": ".event-venue, .show-venue, .venue",
      "description": ".event-description, .show-description, .description"
    },
    "pagination": false,
    "delay": 1000,
    "rateLimit": "1 req/sec"
  }',
  12,
  true,
  NOW(),
  NOW()
);

-- 4. Galaxy Macau Events (1 req/sec)
INSERT INTO event_sources (
  name,
  base_url,
  source_type,
  scrape_config,
  scrape_frequency_hours,
  is_active,
  created_at,
  updated_at
) VALUES (
  'Galaxy Macau Events',
  'https://www.galaxymacau.com/en/entertainment/events',
  'website',
  '{
    "selectors": {
      "title": ".event-title, .entertainment-title, h3, h2",
      "date": ".event-date, .entertainment-date, .date",
      "venue": ".event-venue, .entertainment-venue, .venue",
      "description": ".event-description, .entertainment-description, .description"
    },
    "pagination": true,
    "delay": 1000,
    "rateLimit": "1 req/sec"
  }',
  12,
  true,
  NOW(),
  NOW()
);

-- 5. Macao MICE Portal (0.5 req/sec)
INSERT INTO event_sources (
  name,
  base_url,
  source_type,
  scrape_config,
  scrape_frequency_hours,
  is_active,
  created_at,
  updated_at
) VALUES (
  'Macao MICE Portal',
  'https://www.macaomice.com/en/events',
  'website',
  '{
    "selectors": {
      "title": ".event-title, .mice-title, h3, h2",
      "date": ".event-date, .mice-date, .date",
      "venue": ".event-venue, .mice-venue, .venue",
      "description": ".event-description, .mice-description, .description"
    },
    "pagination": true,
    "delay": 2000,
    "rateLimit": "0.5 req/sec"
  }',
  24,
  true,
  NOW(),
  NOW()
);

-- 6. Broadway Macau Events (1 req/sec)
INSERT INTO event_sources (
  name,
  base_url,
  source_type,
  scrape_config,
  scrape_frequency_hours,
  is_active,
  created_at,
  updated_at
) VALUES (
  'Broadway Macau Events',
  'https://www.broadwaymacau.com.mo/en/entertainment/events',
  'website',
  '{
    "selectors": {
      "title": ".event-title, .show-title, h3, h2",
      "date": ".event-date, .show-date, .date",
      "venue": ".event-venue, .show-venue, .venue",
      "description": ".event-description, .show-description, .description"
    },
    "pagination": true,
    "delay": 1000,
    "rateLimit": "1 req/sec"
  }',
  12,
  true,
  NOW(),
  NOW()
);

-- Verify the sources were added
SELECT
  id,
  name,
  base_url,
  is_active,
  created_at
FROM event_sources
WHERE name LIKE '%Macao%' OR name LIKE '%Macau%' OR name LIKE '%MGTO%'
ORDER BY created_at DESC;