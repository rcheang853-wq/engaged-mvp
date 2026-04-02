import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchHongKongDiscoverEvents } from '@/lib/discover/hong-kong-lcsd';

export const dynamic = 'force-dynamic';

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

    let qb = supabase
      .from('public_events')
      .select(
        'id, title, description, start_at, end_at, all_day, timezone, venue_name, address, city, region, country, url, ticket_url, organizer_name, price_min, price_max, currency, is_free, categories, images, status, created_at, updated_at',
        { count: 'exact' }
      )
      .eq('city', city)
      .eq('status', 'active')
      .gte('start_at', from.toISOString())
      .lt('start_at', to.toISOString());

    if (q) {
      // best-effort search across common text fields
      const safe = q.replace(/[,%]/g, ' ');
      qb = qb.or(
        `title.ilike.%${safe}%,description.ilike.%${safe}%,venue_name.ilike.%${safe}%,address.ilike.%${safe}%,region.ilike.%${safe}%,city.ilike.%${safe}%,organizer_name.ilike.%${safe}%`
      );
    }

    if (freeOnly) {
      qb = qb.eq('is_free', true);
    }

    if (neighborhoods.length) {
      qb = qb.in('region', neighborhoods);
    }

    if (categories.length) {
      // overlap filter for text[]
      qb = qb.overlaps('categories', categories);
    }

    if (onlineOnly) {
      // heuristic: look for 'online' in venue/address/title
      qb = qb.or('venue_name.ilike.%online%,address.ilike.%online%,title.ilike.%online%');
    }

    // sorting
    // TODO: relevance sorting. For now, date sort is canonical.
    if (sort === 'date' || sort === 'relevance') {
      qb = qb.order('start_at', { ascending: true });
    }

    const { data, error, count } = await qb.range(offset, offset + limit - 1);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      meta: {
        city,
        limit,
        offset,
        total: count ?? null,
        window: { from: from.toISOString(), to: to.toISOString() },
        filters: { q, datePreset, chosenDate, neighborhoods, categories, freeOnly, onlineOnly, sort },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
