import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/dev-auth';

export const dynamic = 'force-dynamic';

// GET /api/search/events?q=...&calendar_id=...optional
// Search events across all calendars the user is a member of
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await getAuthUser(supabase);
    if (authError || !user)
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const calendarId = searchParams.get('calendar_id');

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      );
    }

    // First, get all calendar IDs where the user is a member
    const { data: memberCalendars, error: memberError } = await supabase
      .from('calendar_members')
      .select('calendar_id')
      .eq('user_id', user.id);

    if (memberError) throw memberError;

    if (!memberCalendars || memberCalendars.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const calendarIds = memberCalendars.map(m => m.calendar_id);

    // Build search query
    // Filter by calendar_id if specified and user is a member
    let eventsQuery = supabase
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
      `
      )
      .in('calendar_id', calendarIds)
      .order('start_at', { ascending: true });

    if (calendarId) {
      // Verify user is a member of the specified calendar
      if (!calendarIds.includes(calendarId)) {
        return NextResponse.json(
          { success: false, error: 'Access denied to specified calendar' },
          { status: 403 }
        );
      }
      eventsQuery = eventsQuery.eq('calendar_id', calendarId);
    }

    // Search across title, description, and location using text search
    const searchPattern = `%${query}%`;
    eventsQuery = eventsQuery.or(
      `title.ilike.${searchPattern},description.ilike.${searchPattern},location.ilike.${searchPattern}`
    );

    const { data, error } = await eventsQuery;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      query,
      count: data?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
