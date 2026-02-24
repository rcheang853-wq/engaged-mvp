import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/dev-auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  calendar_id: z.string().uuid(),
});

// POST /api/discover/[id]/add-to-calendar
// Creates a calendar_events row that references public_event_id.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: auth, error: authError } = await getAuthUser(supabase);
    const user = auth?.user;
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors }, { status: 400 });
    }

    // Fetch public event
    const { data: publicEvent, error: peErr } = await supabase
      .from('public_events')
      .select('*')
      .eq('id', id)
      .single();

    if (peErr) throw peErr;
    if (!publicEvent) {
      return NextResponse.json({ success: false, error: 'Public event not found' }, { status: 404 });
    }

    // Verify calendar membership (must be a member)
    const { data: memberRow, error: memErr } = await supabase
      .from('calendar_members')
      .select('user_id, role')
      .eq('calendar_id', parsed.data.calendar_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memErr) throw memErr;
    if (!memberRow) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Insert calendar event (snapshot title/description/location at time of add)
    const { data: created, error: insErr } = await supabase
      .from('calendar_events')
      .insert({
        calendar_id: parsed.data.calendar_id,
        title: publicEvent.title,
        description: publicEvent.description,
        location: publicEvent.venue_name ?? publicEvent.address,
        start_at: publicEvent.start_at,
        end_at: publicEvent.end_at,
        all_day: publicEvent.all_day,
        timezone: publicEvent.timezone,
        public_event_id: publicEvent.id,
        created_by: user.id,
      })
      .select()
      .single();

    if (insErr) throw insErr;

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
