-- ============================================================
-- Discover (Public Events) schema migration
-- Phase 1: Schema & migrations
-- ============================================================

-- 1. event_sources: add timezone fields if not already present
ALTER TABLE event_sources
  ADD COLUMN IF NOT EXISTS default_timezone TEXT NOT NULL DEFAULT 'Asia/Macau',
  ADD COLUMN IF NOT EXISTS timezone_strategy TEXT NOT NULL DEFAULT 'explicit_or_default';

-- 2. public_events (new table)
CREATE TABLE IF NOT EXISTS public_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id         UUID REFERENCES event_sources(id) ON DELETE SET NULL,
  source_event_id   TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  start_at          TIMESTAMPTZ NOT NULL,
  end_at            TIMESTAMPTZ,
  all_day           BOOLEAN NOT NULL DEFAULT FALSE,
  timezone          TEXT NOT NULL DEFAULT 'Asia/Macau',
  venue_name        TEXT,
  address           TEXT,
  city              TEXT NOT NULL DEFAULT 'Macau',
  region            TEXT,
  country           TEXT NOT NULL DEFAULT 'MO',
  url               TEXT,
  ticket_url        TEXT,
  organizer_name    TEXT,
  price_min         NUMERIC,
  price_max         NUMERIC,
  currency          TEXT NOT NULL DEFAULT 'HKD',
  is_free           BOOLEAN,
  categories        TEXT[] DEFAULT '{}',
  images            TEXT[] DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','cancelled','postponed','invalid')),
  raw_data          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_id, source_event_id)
);

CREATE INDEX IF NOT EXISTS idx_public_events_status     ON public_events(status);
CREATE INDEX IF NOT EXISTS idx_public_events_start_at   ON public_events(start_at);
CREATE INDEX IF NOT EXISTS idx_public_events_city       ON public_events(city);
CREATE INDEX IF NOT EXISTS idx_public_events_source_id  ON public_events(source_id);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION update_public_events_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_public_events_updated_at ON public_events;
CREATE TRIGGER trg_public_events_updated_at
  BEFORE UPDATE ON public_events
  FOR EACH ROW EXECUTE FUNCTION update_public_events_updated_at();

-- 3. public_event_saves (new table)
CREATE TABLE IF NOT EXISTS public_event_saves (
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  public_event_id   UUID NOT NULL REFERENCES public_events(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, public_event_id)
);
CREATE INDEX IF NOT EXISTS idx_public_event_saves_user ON public_event_saves(user_id);

-- 4. calendar_events: add public_event_id + timezone if missing
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS public_event_id UUID REFERENCES public_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Macau';

CREATE INDEX IF NOT EXISTS idx_calendar_events_public_event_id
  ON calendar_events(public_event_id) WHERE public_event_id IS NOT NULL;

-- 5. Ingestion run log
CREATE TABLE IF NOT EXISTS public_event_source_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id        UUID REFERENCES event_sources(id) ON DELETE SET NULL,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at      TIMESTAMPTZ,
  status           TEXT CHECK (status IN ('success','partial','failed')),
  events_found     INT NOT NULL DEFAULT 0,
  events_upserted  INT NOT NULL DEFAULT 0,
  errors_count     INT NOT NULL DEFAULT 0,
  notes            JSONB
);
CREATE INDEX IF NOT EXISTS idx_pesr_source_id ON public_event_source_runs(source_id);
CREATE INDEX IF NOT EXISTS idx_pesr_started_at ON public_event_source_runs(started_at DESC);

-- 6. Ingestion error log
CREATE TABLE IF NOT EXISTS public_event_ingest_errors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     UUID REFERENCES event_sources(id) ON DELETE SET NULL,
  run_id        UUID REFERENCES public_event_source_runs(id) ON DELETE SET NULL,
  url           TEXT,
  error_type    TEXT,
  message       TEXT,
  happened_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  debug_payload JSONB
);
CREATE INDEX IF NOT EXISTS idx_peie_source_id ON public_event_ingest_errors(source_id);

-- 7. RLS: public_events readable by all (anon + auth)
ALTER TABLE public_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_events_read" ON public_events;
CREATE POLICY "public_events_read"
  ON public_events FOR SELECT USING (true);

-- public_event_saves: users manage their own rows
ALTER TABLE public_event_saves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "saves_select_own" ON public_event_saves;
DROP POLICY IF EXISTS "saves_insert_own" ON public_event_saves;
DROP POLICY IF EXISTS "saves_delete_own" ON public_event_saves;
CREATE POLICY "saves_select_own" ON public_event_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saves_insert_own" ON public_event_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saves_delete_own" ON public_event_saves FOR DELETE USING (auth.uid() = user_id);

-- 8. Upsert macauticket as an event_source (safe insert — idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM event_sources WHERE name = 'MacauTicket.com (Kong Seng)') THEN
    INSERT INTO event_sources (name, base_url, source_type, scrape_config, scrape_frequency_hours, is_active, default_timezone, timezone_strategy)
    VALUES (
      'MacauTicket.com (Kong Seng)',
      'https://www.macauticket.com/TicketWeb2023/en',
      'website',
      '{
        "method": "next_data_json",
        "listing_url": "https://www.macauticket.com/TicketWeb2023/en",
        "detail_url_template": "https://www.macauticket.com/TicketWeb2023/en/programme/{ProCode}",
        "delay_ms": 1000,
        "rate_limit": "1 req/sec",
        "notes": "Parse __NEXT_DATA__ JSON embedded in HTML. No CSS selectors needed."
      }',
      12,
      true,
      'Asia/Macau',
      'explicit_or_default'
    );
  ELSE
    UPDATE event_sources SET
      scrape_config = '{
        "method": "next_data_json",
        "listing_url": "https://www.macauticket.com/TicketWeb2023/en",
        "detail_url_template": "https://www.macauticket.com/TicketWeb2023/en/programme/{ProCode}",
        "delay_ms": 1000,
        "rate_limit": "1 req/sec",
        "notes": "Parse __NEXT_DATA__ JSON embedded in HTML. No CSS selectors needed."
      }',
      is_active = true,
      updated_at = NOW()
    WHERE name = 'MacauTicket.com (Kong Seng)';
  END IF;
END $$;
