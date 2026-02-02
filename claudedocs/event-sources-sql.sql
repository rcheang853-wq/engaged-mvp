-- Event Sources SQL Setup
-- Run this in Supabase Dashboard → SQL Editor

-- Insert 3 test event sources for London events

INSERT INTO event_sources (
  name,
  base_url,
  source_type,
  scrape_config,
  scrape_frequency_hours,
  is_active
) VALUES
(
  'Eventbrite London',
  'https://www.eventbrite.com/d/united-kingdom--london/events/',
  'website',
  '{
    "selectors": {
      "title": ".event-card__title",
      "description": ".event-card__description",
      "startTime": ".event-card__date",
      "location": ".event-card__location",
      "price": ".event-card__price",
      "image": ".event-card__image img",
      "link": ".event-card a"
    },
    "waitFor": {
      "selector": ".event-card",
      "timeout": 10000,
      "networkIdle": true
    },
    "pagination": {
      "enabled": true,
      "nextButtonSelector": ".pagination__next",
      "maxPages": 3
    },
    "rateLimit": {
      "requestsPerSecond": 2,
      "delayBetweenPages": 2000
    }
  }'::jsonb,
  24,
  true
),
(
  'Meetup London',
  'https://www.meetup.com/find/?location=gb--london&source=EVENTS',
  'website',
  '{
    "selectors": {
      "title": "[data-event-label=\"event-card-title\"]",
      "description": ".event-card-description",
      "startTime": "time[datetime]",
      "location": "[data-element-name=\"location-info\"]",
      "price": ".event-price",
      "image": ".event-card__image",
      "link": "a[href*=\"/events/\"]"
    },
    "waitFor": {
      "selector": "[data-event-label=\"event-card\"]",
      "timeout": 15000,
      "networkIdle": true
    },
    "pagination": {
      "enabled": true,
      "scrollToLoad": true,
      "maxScrolls": 5
    },
    "authentication": {
      "required": false
    },
    "rateLimit": {
      "requestsPerSecond": 1,
      "delayBetweenPages": 3000
    }
  }'::jsonb,
  24,
  true
),
(
  'Time Out London Events',
  'https://www.timeout.com/london/things-to-do/events-in-london-today',
  'website',
  '{
    "selectors": {
      "title": "h3._h3_cuogz_1",
      "description": "._description_cuogz_1",
      "startTime": "time",
      "location": "._venue_cuogz_1",
      "price": "._price_cuogz_1",
      "image": "img[src*=\"timeout\"]",
      "link": "a[href*=\"/things-to-do/\"]"
    },
    "waitFor": {
      "selector": "._card_cuogz_1",
      "timeout": 10000,
      "networkIdle": true
    },
    "pagination": {
      "enabled": true,
      "nextButtonSelector": "._loadMore_cuogz_1",
      "maxPages": 3
    },
    "dataTransforms": {
      "dateFormat": "DD/MM/YYYY",
      "locationCleanup": true
    },
    "rateLimit": {
      "requestsPerSecond": 2,
      "delayBetweenPages": 2000
    }
  }'::jsonb,
  24,
  true
);

-- Verify insertion
SELECT
  id,
  name,
  base_url,
  source_type,
  is_active,
  created_at
FROM event_sources
ORDER BY created_at DESC
LIMIT 3;
