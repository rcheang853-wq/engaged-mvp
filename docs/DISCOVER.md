# Discover Feed Notes

## Hong Kong feed

`/api/discover?city=Hong%20Kong` is powered by the LCSD / Hong Kong government Cultural Programmes open dataset instead of HK Ticketing.

Source datasets:

- `https://www.lcsd.gov.hk/datagovhk/event/events.xml`
- `https://www.lcsd.gov.hk/datagovhk/event/eventDates.xml`
- `https://www.lcsd.gov.hk/datagovhk/event/venues.xml`

Implementation notes:

- The API contract stays the same as the existing Discover response.
- Hong Kong events are fetched live from LCSD data and filtered in-app for date window, category chips, search, online, and pagination.
- Event timestamps are normalized to ISO strings in UTC, with `timezone` set to `Asia/Hong_Kong`.
- Category mapping is intentionally simple and fixed to: `Dance`, `Drama`, `Music`, `Sport`, `Exhibition`, `Others`.
- English fields are preferred where LCSD provides them, with Chinese fields used as fallback.

## Limitations

- LCSD does not consistently expose structured pricing. When pricing is missing, the event is treated as `is_free = null`.
- Because of that, `freeOnly=true` only includes events explicitly marked free. Events with unknown pricing are excluded.
- LCSD venue data does not provide a structured address/region field in this integration, so Hong Kong neighborhood filtering is limited.
- Some LCSD records only provide date-level schedule data. When no reliable start time is present, the event is treated as all-day for display.
- Save/heart support is still backed by `public_events`, so live LCSD Hong Kong events are not persisted to saved events yet.
