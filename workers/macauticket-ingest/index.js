/**
 * MacauTicket.com ingestion worker
 * 
 * Strategy:
 *   1. Fetch listing page → parse __NEXT_DATA__ JSON (no DOM scraping)
 *   2. Fetch detail page per event → parse __NEXT_DATA__ for venue + description
 *   3. Normalize dates as Asia/Macau → store UTC in public_events
 *   4. Upsert to Supabase, log run
 * 
 * Run:  node workers/macauticket-ingest/index.js
 * Cron: every 12h via node-cron or external scheduler
 */

import { createClient } from '@supabase/supabase-js'
import { load as cheerioLoad } from 'cheerio'
import * as dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ── Config ────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../.env.local') })

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY
const SOURCE_NAME     = 'MacauTicket.com (Kong Seng)'
const LISTING_URL     = 'https://www.macauticket.com/TicketWeb2023/en'
const DETAIL_BASE     = 'https://www.macauticket.com/TicketWeb2023/en/programme'
const MACAU_TZ        = 'Asia/Macau'
const DELAY_MS        = 1200   // ~1 req/sec politeness delay
const MAX_DETAIL_FETCH = 60    // cap to avoid hammering; increase if needed

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/**
 * Fetch a URL and extract __NEXT_DATA__ as parsed JSON.
 */
async function fetchNextData(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml',
      'Referer': LISTING_URL,
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const html = await res.text()
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!match) throw new Error(`No __NEXT_DATA__ found at ${url}`)
  return JSON.parse(match[1])
}

/**
 * Convert a MacauTicket date string to UTC ISO string.
 * 
 * Formats seen:
 *   "2026/02/25 19:45"       → single datetime
 *   "2026/02/25 19:45 & 2026/02/26 15:00"  → multiple (take first)
 *   "2026/02/19 - 2026/02/24"  → date range (take first, all_day)
 *   "Please See The Below"   → null
 *   "--"                     → null
 * 
 * Macau is UTC+8, no DST.
 */
function parseMacauDate(dateStr) {
  if (!dateStr || /please|see|below|--|TBD/i.test(dateStr)) {
    return { start_at: null, end_at: null, all_day: false }
  }

  // Take the first datetime segment (before " & " or " - ")
  const first = dateStr.split(/\s+&\s+/)[0].split(' - ')[0].trim()

  // Try "YYYY/MM/DD HH:MM" or "YYYY/MM/DD  HH:MM"
  const dtMatch = first.match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/)
  if (dtMatch) {
    const [, y, mo, d, h, mi] = dtMatch
    // Build ISO string with +08:00 offset
    const iso = `${y}-${mo}-${d}T${h}:${mi}:00+08:00`
    return { start_at: new Date(iso).toISOString(), end_at: null, all_day: false }
  }

  // Try "YYYY/MM/DD" (date only → all_day)
  const dMatch = first.match(/(\d{4})\/(\d{2})\/(\d{2})/)
  if (dMatch) {
    const [, y, mo, d] = dMatch
    const start = new Date(`${y}-${mo}-${d}T00:00:00+08:00`)
    const end   = new Date(`${y}-${mo}-${d}T00:00:00+08:00`)
    end.setDate(end.getDate() + 1)
    return { start_at: start.toISOString(), end_at: end.toISOString(), all_day: true }
  }

  return { start_at: null, end_at: null, all_day: false }
}

/**
 * Parse a price string into { price_min, price_max, is_free, currency }.
 * Examples: "$150,$180"  "$696, $576, $456"  "Free"  "Please see below"
 */
function parsePrice(priceStr) {
  if (!priceStr) return { price_min: null, price_max: null, is_free: null }
  if (/free/i.test(priceStr)) return { price_min: 0, price_max: 0, is_free: true }

  const nums = [...priceStr.matchAll(/\$?\s*(\d[\d,]*)/g)]
    .map(m => parseFloat(m[1].replace(/,/g, '')))
    .filter(n => !isNaN(n))

  if (!nums.length) return { price_min: null, price_max: null, is_free: null }

  return {
    price_min: Math.min(...nums),
    price_max: Math.max(...nums),
    is_free: false,
  }
}

/**
 * Strip HTML tags from a string using cheerio.
 */
function stripHtml(html) {
  if (!html) return null
  const $ = cheerioLoad(html)
  return $.text().replace(/\s+/g, ' ').trim() || null
}

/**
 * Map a raw showListData item + optional detail data → public_events row shape.
 */
function normalizeEvent(raw, detail, sourceId) {
  const dateInfo  = parseMacauDate(raw.ShowDate)
  const priceInfo = parsePrice(raw.PriceDesc || raw.Price)

  // Venue from detail page ProListData[0], fallback null
  const venueName = detail?.proList?.ProListData?.[0]?.VenueName ?? null

  // Description from proInfo[0] (HTML → plain text)
  const descHtml  = detail?.proInfo?.[0]?.Content ?? null
  const description = stripHtml(descHtml)

  // Images: thumbnail first (landscape, better hero fit), portrait second
  const images = [raw.PictureS, raw.PictureP].filter(Boolean)

  // Category
  const categories = raw.ProType ? [raw.ProType] : []

  // Ticket URL
  const ticketUrl = `https://www.macauticket.com/TicketWeb2023/en/programme/${raw.ProCode}`

  // Status mapping
  let status = 'active'
  if (raw.Status === '0') status = 'invalid'

  return {
    source_id:        sourceId,
    source_event_id:  raw.ProCode,
    title:            raw.ProName1?.trim() || '(untitled)',
    description,
    ...dateInfo,
    timezone:         MACAU_TZ,
    venue_name:       venueName,
    city:             'Macau',
    country:          'MO',
    url:              ticketUrl,
    ticket_url:       ticketUrl,
    organizer_name:   detail?.proList?.SPName ?? null,
    ...priceInfo,
    currency:         'HKD',
    categories,
    images,
    status,
    raw_data: {
      ProCode:     raw.ProCode,
      ProType:     raw.ProType,
      ShowDate:    raw.ShowDate,
      SPID:        raw.SPID,
      WEBStatus:   raw.WEBStatus,
      WEBStatusStr: raw.WEBStatusStr,
      OpenFrom:    raw.OpenFrom,
      OpenTo:      raw.OpenTo,
    },
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[macauticket-ingest] Starting @ ${new Date().toISOString()}`)

  // 1. Get source record
  const { data: sources, error: srcErr } = await supabase
    .from('event_sources')
    .select('id')
    .eq('name', SOURCE_NAME)
    .limit(1)

  if (srcErr || !sources?.length) {
    console.error('[macauticket-ingest] Source not found in event_sources. Run migration first.')
    process.exit(1)
  }
  const sourceId = sources[0].id

  // 2. Start run log
  const { data: runRow } = await supabase
    .from('public_event_source_runs')
    .insert({ source_id: sourceId, started_at: new Date().toISOString() })
    .select('id')
    .single()
  const runId = runRow?.id

  const stats = { found: 0, upserted: 0, errors: 0 }
  const errorLog = []

  try {
    // 3. Fetch listing
    console.log(`[macauticket-ingest] Fetching listing: ${LISTING_URL}`)
    const listingData = await fetchNextData(LISTING_URL)
    const showList = listingData?.props?.pageProps?.showListData ?? []
    stats.found = showList.length
    console.log(`[macauticket-ingest] Found ${stats.found} events on listing page`)

    // Filter out non-event types (Film, Shopping) if desired — keep all for MVP
    const toProcess = showList.slice(0, MAX_DETAIL_FETCH)

    // 4. Fetch details + upsert in batches
    for (let i = 0; i < toProcess.length; i++) {
      const raw = toProcess[i]
      let detail = null

      try {
        await sleep(DELAY_MS)
        const detailUrl = `${DETAIL_BASE}/${raw.ProCode}`
        console.log(`[macauticket-ingest] [${i+1}/${toProcess.length}] ${raw.ProCode} - ${raw.ProName1?.substring(0,50)}`)
        const detailData = await fetchNextData(detailUrl)
        detail = detailData?.props?.pageProps ?? null
      } catch (e) {
        console.warn(`[macauticket-ingest] Detail fetch failed for ${raw.ProCode}: ${e.message}`)
        errorLog.push({ source_id: sourceId, run_id: runId, url: `${DETAIL_BASE}/${raw.ProCode}`, error_type: 'fetch_error', message: e.message })
        stats.errors++
        // continue without detail — we still have listing data
      }

      const normalized = normalizeEvent(raw, detail, sourceId)

      // Skip events with no parseable start_at
      if (!normalized.start_at) {
        console.log(`  ↳ Skipping ${raw.ProCode} — no parseable date ("${raw.ShowDate}")`)
        continue
      }

      const { error: upsertErr } = await supabase
        .from('public_events')
        .upsert(normalized, {
          onConflict: 'source_id,source_event_id',
          ignoreDuplicates: false,
        })

      if (upsertErr) {
        console.warn(`  ↳ Upsert error for ${raw.ProCode}: ${upsertErr.message}`)
        errorLog.push({ source_id: sourceId, run_id: runId, url: `${DETAIL_BASE}/${raw.ProCode}`, error_type: 'upsert_error', message: upsertErr.message })
        stats.errors++
      } else {
        stats.upserted++
        console.log(`  ↳ ✅ Upserted: ${normalized.title.substring(0,50)} @ ${normalized.start_at}`)
      }
    }

    // 5. Write error log rows
    if (errorLog.length) {
      await supabase.from('public_event_ingest_errors').insert(errorLog)
    }

    // 6. Finalize run log
    await supabase
      .from('public_event_source_runs')
      .update({
        finished_at:    new Date().toISOString(),
        status:         stats.errors === 0 ? 'success' : stats.upserted > 0 ? 'partial' : 'failed',
        events_found:   stats.found,
        events_upserted: stats.upserted,
        errors_count:   stats.errors,
        notes:          { max_detail_fetch: MAX_DETAIL_FETCH },
      })
      .eq('id', runId)

    console.log(`\n[macauticket-ingest] Done.`)
    console.log(`  Found:    ${stats.found}`)
    console.log(`  Upserted: ${stats.upserted}`)
    console.log(`  Errors:   ${stats.errors}`)

  } catch (fatal) {
    console.error(`[macauticket-ingest] Fatal error:`, fatal)
    await supabase
      .from('public_event_source_runs')
      .update({ finished_at: new Date().toISOString(), status: 'failed', notes: { error: fatal.message } })
      .eq('id', runId)
    process.exit(1)
  }
}

main()
