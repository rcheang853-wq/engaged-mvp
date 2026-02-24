import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/discover
// Public endpoint (RLS allows SELECT). Supports pagination and upcoming window.
// Query params:
//   days (default 60)
//   limit (default 20, max 50)
//   offset (default 0)
//   city (default Macau)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const days = Math.min(Math.max(Number(searchParams.get('days') ?? 60), 1), 365);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 20), 1), 50);
    const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0);
    const city = (searchParams.get('city') ?? 'Macau').trim();

    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const supabase = (await createServerSupabaseClient()) as any;

    const { data, error, count } = await supabase
      .from('public_events')
      .select(
        'id, title, description, start_at, end_at, all_day, timezone, venue_name, address, city, region, country, url, ticket_url, organizer_name, price_min, price_max, currency, is_free, categories, images, status, created_at, updated_at',
        { count: 'exact' }
      )
      .eq('city', city)
      .eq('status', 'active')
      .gte('start_at', now.toISOString())
      .lt('start_at', end.toISOString())
      .order('start_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      meta: {
        city,
        days,
        limit,
        offset,
        total: count ?? null,
        window: { from: now.toISOString(), to: end.toISOString() },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
