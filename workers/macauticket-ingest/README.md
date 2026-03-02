# MacauTicket.com Ingestion Worker

Pulls all Macau events from **macauticket.com** (Kong Seng) and upserts
them into `public_events` in Supabase.

## How it works

No scraping. No CSS selectors. MacauTicket.com is built on Next.js and
embeds all data as JSON in the page's `__NEXT_DATA__` block.

```
Step 1: GET /TicketWeb2023/en       â†’ parse showListData[] from __NEXT_DATA__
Step 2: GET /programme/{ProCode}    â†’ parse proList + proInfo from __NEXT_DATA__
Step 3: Normalize dates (Asia/Macau â†’ UTC) + upsert to Supabase
```

Covers ~90% of Macau entertainment events (concerts, drama, dance,
sports, film) because Kong Seng is the official ticketing partner of
MGTO, Cultural Affairs Bureau, Venetian, Broadway, Studio City, and more.

## Run

```bash
# From the project root
npm run ingest:macauticket

# Or directly
node workers/macauticket-ingest/index.js
```

Requires `.env.local` at the project root with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Before first run

1. Apply the migration in Supabase SQL editor:
   `supabase/migrations/20260224_discover_schema.sql`

2. Confirm the `MacauTicket.com (Kong Seng)` row exists in `event_sources`
   (the migration inserts it automatically).

## Schema produced

```
public_events
  source_event_id  â†’ ProCode (e.g. "P-055808")
  title            â†’ ProName1
  start_at         â†’ ShowDate parsed as Asia/Macau â†’ UTC timestamptz
  end_at           â†’ null (detail sessions have individual times)
  timezone         â†’ "Asia/Macau"
  venue_name       â†’ from detail page ProListData[0].VenueName
  description      â†’ from detail page proInfo[0].Content (HTML stripped)
  organizer_name   â†’ SPName
  price_min/max    â†’ parsed from PriceDesc
  is_free          â†’ true if "Free"
  images           â†’ [PictureP, PictureS]
  categories       â†’ [ProType]  e.g. ["Music"]
  city             â†’ "Macau" (hardcoded)
  currency         â†’ "HKD"
  ticket_url       â†’ full programme URL
  raw_data         â†’ original JSON snapshot
```

## Rate limiting

- 1 request per 1.2 seconds (DELAY_MS = 1200)
- Fetches up to MAX_DETAIL_FETCH = 60 detail pages per run
- Increase MAX_DETAIL_FETCH if the listing grows beyond 60 events

## Cron schedule (every 12h)

Add to OpenClaw cron or a system cron:

```
0 */12 * * *  cd /path/to/Engage Calendar && node workers/macauticket-ingest/index.js >> /tmp/macauticket-ingest.log 2>&1
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Source not found" | Migration not applied | Run `20260224_discover_schema.sql` |
| `start_at: null` for many events | ShowDate = "Please See The Below" | Expected â€” these are season passes without fixed dates |
| Detail fetch 403/blocked | Rate limit hit | Increase DELAY_MS |
| `__NEXT_DATA__ not found` | macauticket changed their tech stack | Re-inspect page source, update parser |

