import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchHongKongDiscoverEventById } from '@/lib/discover/hong-kong-lcsd';

export const dynamic = 'force-dynamic';

// GET /api/discover/[id] — single public event
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (id.startsWith('hk-lcsd__')) {
      const data = await fetchHongKongDiscoverEventById(id);
      if (!data) {
        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data });
    }

    const supabase = (await createServerSupabaseClient()) as any;

    if (id.startsWith('user-')) {
      const personalId = id.replace(/^user-/, '');
      const { data: personal, error: personalError } = await supabase
        .from('personal_events')
        .select('id, title, notes, start_time, end_time, location, created_at, updated_at, discoverable_by_others')
        .eq('id', personalId)
        .eq('discoverable_by_others', true)
        .single();

      if (personalError || !personal) {
        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      }

      const data = {
        id,
        title: personal.title,
        description: personal.notes ?? null,
        start_at: personal.start_time,
        end_at: personal.end_time,
        all_day: false,
        timezone: 'Asia/Macau',
        venue_name: personal.location ?? null,
        address: personal.location ?? null,
        organizer_name: 'Community',
        price_min: null,
        price_max: null,
        is_free: true,
        currency: 'MOP',
        images: [],
        categories: ['community'],
        ticket_url: null,
        created_at: personal.created_at,
        source_type: 'user_created',
      };

      return NextResponse.json({ success: true, data });
    }

    if (id.startsWith('calendar-')) {
      const calendarEventId = id.replace(/^calendar-/, '');
      const { data: calendarEvent, error: calendarEventError } = await supabase
        .from('calendar_events')
        .select(
          'id, title, description, start_at, end_at, all_day, timezone, location, url, category_main, tags, created_at, updated_at, discoverable_by_others'
        )
        .eq('id', calendarEventId)
        .eq('discoverable_by_others', true)
        .single();

      if (calendarEventError || !calendarEvent) {
        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      }

      const categories = [
        calendarEvent.category_main,
        ...(Array.isArray(calendarEvent.tags) ? calendarEvent.tags : []),
      ].filter(Boolean);

      const data = {
        id,
        title: calendarEvent.title,
        description: calendarEvent.description ?? null,
        start_at: calendarEvent.start_at,
        end_at: calendarEvent.end_at,
        all_day: calendarEvent.all_day ?? false,
        timezone: calendarEvent.timezone ?? 'Asia/Macau',
        venue_name: calendarEvent.location ?? null,
        address: calendarEvent.location ?? null,
        organizer_name: 'Community',
        price_min: null,
        price_max: null,
        is_free: true,
        currency: 'MOP',
        images: [],
        categories: categories.length ? categories : ['community'],
        ticket_url: null,
        url: calendarEvent.url ?? null,
        created_at: calendarEvent.created_at,
        source_type: 'user_created',
      };

      return NextResponse.json({ success: true, data });
    }

    const { data, error } = await supabase
      .from('public_events')
      .select('*')
      .eq('id', id)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
