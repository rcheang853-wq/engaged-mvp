import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchHongKongDiscoverEvents } from '@/lib/discover/hong-kong-lcsd';
import { enrichEventsWithOgImages } from '@/lib/scrape-og-image';

export const dynamic = 'force-dynamic';

function mapPersonalEventToDiscoverRow(row: any) {
  return {
    id: `user-${row.id}`,
    title: row.title,
    description: row.notes ?? null,
    start_at: row.start_time,
    end_at: row.end_time,
    all_day: false,
    timezone: 'Asia/Macau',
    venue_name: row.location ?? null,
    address: row.location ?? null,
    city: 'Macau',
    region: null,
    country: 'MO',
    url: null,
    ticket_url: null,
    organizer_name: 'Community',
    price_min: null,
    price_max: null,
    currency: 'MOP',
    is_free: true,
    categories: ['community'],
    images: [],
    status: 'active',
    created_at: row.created_at,
    updated_at: row.updated_at,
    source_type: 'user_created',
  };
}

function mapCalendarEventToDiscoverRow(row: any) {
  const categories = [
    row.category_main,
    ...(Array.isArray(row.tags) ? row.tags : []),
  ].filter(Boolean);

  return {
    id: `calendar-${row.id}`,
    title: row.title,
    description: row.description ?? null,
    start_at: row.start_at,
    end_at: row.end_at,
    all_day: row.all_day ?? false,
    timezone: row.timezone ?? 'Asia/Macau',
    venue_name: row.location ?? null,
    address: row.location ?? null,
    city: 'Macau',
    region: null,
    country: 'MO',
    url: row.url ?? null,
    ticket_url: null,
    organizer_name: 'Community',
    price_min: null,
    price_max: null,
    currency: 'MOP',
    is_free: true,
    categories: categories.length ? categories : ['community'],
    images: [],
    status: 'active',
    created_at: row.created_at,
    updated_at: row.updated_at,
    source_type: 'user_created',
  };
}

function discoverRowMatchesFilters(
  row: any,
  filters: {
    neighborhoods: string[];
    categories: string[];
    freeOnly: boolean;
    onlineOnly: boolean;
  }
) {
  if (filters.freeOnly && row.is_free !== true) return false;

  if (filters.neighborhoods.length) {
    const region = typeof row.region === 'string' ? row.region : '';
    if (!filters.neighborhoods.includes(region)) return false;
  }

  if (filters.categories.length) {
    const rowCategories = Array.isArray(row.categories) ? row.categories : [];
    if (!filters.categories.some((category) => rowCategories.includes(category))) return false;
  }

  if (filters.onlineOnly) {
    const haystack = [row.venue_name, row.address, row.title].filter(Boolean).join(' ').toLowerCase();
    if (!haystack.includes('online')) return false;
  }

  return true;
}

// GET /api/discover
// Public endpoint (RLS allows SELECT). Supports pagination + filters.
// Query params:
//   days (default 60) OR from/to (ISO)
//   limit (default 20, max 50)
//   offset (default 0)
//   city (default Macau). Supported values in UI: Macau | Hong Kong | China (Mainland China)
//   q (text search - title/venue/address)
//   date (any|today|tomorrow|week|weekend|choose) + chosenDate (YYYY-MM-DD)
//   neighborhoods (comma list) -> matches region
//   categories (comma list) -> overlaps public_events.categories
//   free=1
//   online=1 (best-effort heuristic)
//   sort=relevance|date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const days = Math.min(Math.max(Number(searchParams.get('days') ?? 60), 1), 365);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 20), 1), 50);
    const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0);
    const city = (searchParams.get('city') ?? 'Macau').trim();

    const q = (searchParams.get('q') ?? '').trim();
    const datePreset = (searchParams.get('date') ?? 'any').trim();
    const chosenDate = (searchParams.get('chosenDate') ?? '').trim();

    const neighborhoodsRaw = (searchParams.get('neighborhoods') ?? '').trim();
    const categoriesRaw = (searchParams.get('categories') ?? '').trim();

    const freeOnly = searchParams.get('free') === '1';
    const onlineOnly = searchParams.get('online') === '1';
    const sort = (searchParams.get('sort') ?? 'relevance').trim();

    const now = new Date();

    // compute window
    let from = searchParams.get('from') ? new Date(String(searchParams.get('from'))) : now;
    let to = searchParams.get('to')
      ? new Date(String(searchParams.get('to')))
      : new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (datePreset !== 'any') {
      const today = startOfDay(now);
      if (datePreset === 'today') {
        from = today;
        to = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      } else if (datePreset === 'tomorrow') {
        from = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
      } else if (datePreset === 'week') {
        from = today;
        to = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else if (datePreset === 'weekend') {
        // next Sat 00:00 -> Mon 00:00
        const day = today.getDay(); // 0 Sun ... 6 Sat
        const daysUntilSat = (6 - day + 7) % 7;
        from = new Date(today.getTime() + daysUntilSat * 24 * 60 * 60 * 1000);
        to = new Date(from.getTime() + 2 * 24 * 60 * 60 * 1000);
      } else if (datePreset === 'choose' && chosenDate) {
        const parts = chosenDate.split('-').map((n) => Number(n));
        if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
          from = new Date(parts[0], parts[1] - 1, parts[2]);
          to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
        }
      }
    }

    const neighborhoods = neighborhoodsRaw
      ? neighborhoodsRaw.split(',').map((s) => decodeURIComponent(s.trim())).filter(Boolean)
      : [];

    const categories = categoriesRaw
      ? categoriesRaw.split(',').map((s) => decodeURIComponent(s.trim())).filter(Boolean)
      : [];

    if (city === 'Hong Kong') {
      const result = await fetchHongKongDiscoverEvents({
        from,
        to,
        limit,
        offset,
        q,
        neighborhoods,
        categories,
        freeOnly,
        onlineOnly,
        sort: sort === 'date' ? 'date' : 'relevance',
      });

      void enrichEventsWithOgImages(result.data).catch(() => {
        // Best-effort enrichment only; never block the discover response on OG scraping
      });

      return NextResponse.json({
        success: true,
        data: result.data,
        meta: {
          city,
          limit,
          offset,
          total: result.total,
          window: { from: from.toISOString(), to: to.toISOString() },
          filters: { q, datePreset, chosenDate, neighborhoods, categories, freeOnly, onlineOnly, sort },
        },
      });
    }

    const supabase = (await createServerSupabaseClient()) as any;

    let publicQuery = supabase
      .from('public_events')
      .select(
        'id, title, description, start_at, end_at, all_day, timezone, venue_name, address, city, region, country, url, ticket_url, organizer_name, price_min, price_max, currency, is_free, categories, images, status, created_at, updated_at'
      )
      .eq('city', city)
      .eq('status', 'active')
      .gte('start_at', from.toISOString())
      .lt('start_at', to.toISOString());

    if (q) {
      const safe = q.replace(/[,%]/g, ' ');
      publicQuery = publicQuery.or(
        `title.ilike.%${safe}%,description.ilike.%${safe}%,venue_name.ilike.%${safe}%,address.ilike.%${safe}%,region.ilike.%${safe}%,city.ilike.%${safe}%,organizer_name.ilike.%${safe}%`
      );
    }

    if (freeOnly) publicQuery = publicQuery.eq('is_free', true);
    if (neighborhoods.length) publicQuery = publicQuery.in('region', neighborhoods);
    if (categories.length) publicQuery = publicQuery.overlaps('categories', categories);
    if (onlineOnly) {
      publicQuery = publicQuery.or('venue_name.ilike.%online%,address.ilike.%online%,title.ilike.%online%');
    }

    const { data: publicData, error: publicError } = await publicQuery;
    if (publicError) throw publicError;

    let personalQuery = supabase
      .from('personal_events')
      .select('id, title, notes, start_time, end_time, location, created_at, updated_at')
      .eq('discoverable_by_others', true)
      .gte('start_time', from.toISOString())
      .lt('start_time', to.toISOString());

    if (q) {
      const safe = q.replace(/[,%]/g, ' ');
      personalQuery = personalQuery.or(`title.ilike.%${safe}%,notes.ilike.%${safe}%,location.ilike.%${safe}%`);
    }

    const { data: personalData, error: personalError } = await personalQuery;
    if (personalError) throw personalError;

    let calendarQuery = supabase
      .from('calendar_events')
      .select(
        'id, title, description, start_at, end_at, all_day, timezone, location, url, category_main, tags, created_at, updated_at'
      )
      .eq('discoverable_by_others', true)
      .gte('start_at', from.toISOString())
      .lt('start_at', to.toISOString());

    if (q) {
      const safe = q.replace(/[,%]/g, ' ');
      calendarQuery = calendarQuery.or(
        `title.ilike.%${safe}%,description.ilike.%${safe}%,location.ilike.%${safe}%,category_main.ilike.%${safe}%`
      );
    }

    const { data: calendarData, error: calendarError } = await calendarQuery;
    if (calendarError) throw calendarError;

    const merged = [
      ...((publicData ?? []).map((row: any) => ({ ...row, source_type: 'public_ingested' }))),
      ...(city === 'Macau' ? (personalData ?? []).map(mapPersonalEventToDiscoverRow) : []),
      ...(city === 'Macau' ? (calendarData ?? []).map(mapCalendarEventToDiscoverRow) : []),
    ].filter((row) =>
      discoverRowMatchesFilters(row, { neighborhoods, categories, freeOnly, onlineOnly })
    );

    merged.sort((a: any, b: any) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

    const paged = merged.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paged,
      meta: {
        city,
        limit,
        offset,
        total: merged.length,
        window: { from: from.toISOString(), to: to.toISOString() },
        filters: { q, datePreset, chosenDate, neighborhoods, categories, freeOnly, onlineOnly, sort },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
