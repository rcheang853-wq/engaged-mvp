import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/dev-auth';

export const dynamic = 'force-dynamic';

// GET /api/private-events?start=ISO&end=ISO&offset=0&limit=20&q=optional
// Returns calendar events across all calendars the user is a member of (viewer/owner), read-only.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await getAuthUser(supabase);

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const offset = Number(searchParams.get('offset') ?? '0');
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '20')));
    const q = searchParams.get('q')?.trim();

    if (!start || !end) {
      return NextResponse.json({ success: false, error: 'start and end are required' }, { status: 400 });
    }

    const { data: memberCalendars, error: memberError } = await supabase
      .from('calendar_members')
      .select('calendar_id')
      .eq('user_id', user.id);

    if (memberError) throw memberError;

    const calendarIds = (memberCalendars ?? []).map((m) => m.calendar_id);
    if (!calendarIds.length) {
      return NextResponse.json({ success: true, data: [], total: 0 });
    }

    let query = supabase
      .from('calendar_events')
      .select(
        `
        id,
        calendar_id,
        title,
        description,
        location,
        start_at,
        end_at,
        all_day,
        color,
        created_at,
        calendars(id, name, color)
      `,
        { count: 'exact' }
      )
      .in('calendar_id', calendarIds)
      .gte('start_at', start)
      .lte('start_at', end)
      .order('start_at', { ascending: true });

    if (q) {
      const searchPattern = `%${q}%`;
      query = query.or(
        `title.ilike.${searchPattern},description.ilike.${searchPattern},location.ilike.${searchPattern}`
      );
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    return NextResponse.json({ success: true, data: data ?? [], total: count ?? null, offset, limit });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
