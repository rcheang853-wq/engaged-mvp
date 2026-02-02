-- Update MGTO City Events source with correct CSS selectors
-- Based on actual HTML structure analysis

UPDATE event_sources
SET scrape_config = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          scrape_config,
          '{selectors,title}',
          '".m-calendar__event-name, .cx-t20.m-calendar__event-name"'
        ),
        '{selectors,date}',
        '".cx-list__item:has(.fa-calendar), .cx-t01.cx-list--sm .-fade"'
      ),
      '{selectors,venue}',
      '".m-calendar__item"'
    ),
    '{selectors,description}',
    '"article .cx-col:last-child"'
  ),
  '{delay}',
  '3000'
)
WHERE name = 'MGTO City Events';

-- Verify the update
SELECT
  id,
  name,
  base_url,
  scrape_config->'selectors' as selectors,
  updated_at
FROM event_sources
WHERE name = 'MGTO City Events';