# Discover (Public Events) â€” Architecture Reference

**Status:** MVP complete  
**Last updated:** 2026-02-25

---

## Overview

The **Discover** tab ("Nearby") powers a public event feed for Macau â€” like a local public events directory.  
Users can browse upcoming events, save (heart) them, and add them to any of their personal calendars.

No GPS required. MVP scope is fixed to Macau.

---

## Data Flow

```
MacauTicket.com (Kong Seng)         â€” source of truth for ~90% of Macau ticketed events
        â”‚
        â”‚  GET /TicketWeb2023/en          â†’ __NEXT_DATA__ JSON (full event list, no scraping)
        â”‚  GET /TicketWeb2023/en/programme/{ProCode}  â†’ detail __NEXT_DATA__ (venue, description)
        â–¼
workers/macauticket-ingest/index.js  â€” Node.js ingestion worker (ESM)
        â”‚  runs every 12h via OpenClaw cron (model: openai/gpt-4o-mini, thinking: off)
        â”‚  normalizes dates â†’ Asia/Macau (UTC+8 fixed, no DST) â†’ UTC timestamptz
        â–¼
Supabase: public_events              â€” canonical normalized events table
        â”‚
        â–¼
API routes (/api/discover/*)        â€” Next.js App Router API
        â”‚
        â–¼
UI pages (/discover, /discover/[id], /saved)  â€” Next.js client components
```

---

## Why MacauTicket.com?

Research (2026-02-24) found that the original 6 sources were unusable:
- MICE Portal: **domain for sale** (dead)
- Londoner/Venetian: **wrong URLs** + Sands SPA (JS-heavy, 404s)
- Galaxy: **redirect loops**
- Broadway: **empty JS shell**
- MGTO: **fully JS-rendered**, no public API

MacauTicket.com (Kong Seng) is the official ticketing partner of MGTO, Cultural Affairs Bureau, Venetian Macao, MGM, Broadway Macau, Studio City, Macao Cultural Centre, Sports Development Board, etc. One source covers ~90% of all ticketed events.

**Key insight:** The site is built on Next.js. All event data is embedded as JSON in the HTML's `__NEXT_DATA__` block. No CSS selectors. No fragile DOM parsing. Just `JSON.parse`.

---

## Ingestion Worker

**Path:** `workers/macauticket-ingest/index.js`  
**Run:** `npm run ingest:macauticket` (or `node workers/macauticket-ingest/index.js`)  
**Schedule:** Every 12h via OpenClaw cron (gpt-4o-mini, thinking off, announces to Telegram)

### What it does
1. `GET /TicketWeb2023/en` â†’ parse `__NEXT_DATA__.props.pageProps.showListData`
2. For each `ProCode`, `GET /TicketWeb2023/en/programme/{ProCode}` â†’ parse `__NEXT_DATA__` for venue + description
3. Rate limit: 1.2s delay between detail fetches
4. Upsert into `public_events` (UNIQUE on `source_id, source_event_id`)
5. Log run to `public_event_source_runs`

### Date parsing
- Input: `"2026/02/25 19:45"` (local Macau time, no timezone)
- Policy: treat as `Asia/Macau` (UTC+8, fixed, no DST)
- Output: `2026-02-25T11:45:00.000Z` stored as `TIMESTAMPTZ`

---

## Database Schema

```sql
event_sources            -- source config (scrape_config JSONB)
public_events            -- normalized canonical events
public_event_saves       -- user saves (heart) â€” scoped by auth.uid()
public_event_source_runs -- ingestion run log (success/partial/failed)
public_event_ingest_errors -- per-URL error log
calendar_events          -- existing table; added: public_event_id, timezone
```

### Key constraints
- `public_events`: `UNIQUE(source_id, source_event_id)` â€” safe to re-run ingestion
- `public_event_saves`: `PRIMARY KEY (user_id, public_event_id)` â€” no duplicate saves
- `calendar_events.timezone` NOT NULL DEFAULT `'Asia/Macau'` â€” timezone preserved at creation time

### Timezone policy
- `public_events.timezone` = `Asia/Macau` (always, for MVP)
- `calendar_events.timezone` = copied from `public_events.timezone` at "Add to calendar" time
- `calendars.timezone` = used for display/bucketing in month view
- All `start_at` / `end_at` stored as **UTC** (`TIMESTAMPTZ`)

---

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/discover` | Public | Paginated Macau events (`days=60`, `limit=20`, `offset=0`) |
| `GET` | `/api/discover/[id]` | Public | Single event |
| `POST` | `/api/discover/[id]/save` | Required | Save (heart) event |
| `DELETE` | `/api/discover/[id]/save` | Required | Unsave |
| `GET` | `/api/discover/saved` | Required | User's saved events |
| `POST` | `/api/discover/[id]/add-to-calendar` | Required | Create `calendar_events` row |

---

## UI Pages

| Page | Route | Notes |
|------|-------|-------|
| Nearby list | `/discover` | Search, cards (thumbnail/date/price/heart), "Popular near you" |
| Event detail | `/discover/[id]` | Hero carousel (max 3 images), date/location/organizer cards, Add to Calendar modal |
| Saved | `/saved` | Segmented tabs: Public / Calendars; 401 shows friendly auth CTA |

### Image ordering
- `images[0]` = `PictureS` (thumbnail, 370Ã—310, landscape) â€” hero first slide
- `images[1]` = `PictureP` (portrait poster, 400Ã—566) â€” hero second slide
- Max 3 images in carousel

### "Add to calendar" flow
1. User taps "Add to calendar" on detail page
2. Bottom sheet appears â†’ lists user's calendars (from `/api/calendars`)
3. User picks calendar â†’ `POST /api/discover/[id]/add-to-calendar` with `{ calendar_id }`
4. Creates `calendar_events` row with correct `start_at`, `timezone`, and `public_event_id` (provenance)
5. UI shows âœ… "Added to {calendarName}"

---

## Access

- Dev server: `http://localhost:3000/discover`
- Tailscale: `http://100.106.43.20:3000/discover`
- Dev login (bypass auth): `/dev-login`

---

## Known gaps (post-MVP)

- [ ] MGTO government events (JS-rendered, need Playwright)
- [ ] public events directory Macau (thin coverage, needs OAuth API key)
- [ ] Star/save calendar events (Saved â†’ Calendars tab)
- [ ] GPS / location filtering (deliberately deferred)
- [ ] Event categories filter
- [ ] Past events cleanup job (remove `start_at < now - 7d`)

