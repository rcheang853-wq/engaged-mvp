import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  start_at: z.string().datetime().optional(),
  end_at: z.string().datetime().optional(),
  all_day: z.boolean().optional(),
  location: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// GET /api/calendars/[id]/events/[eventId]
export async function GET(_req: NextRequest, { params }: { params: { id: string; eventId: string } }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('calendar_events')
      .select(`*, profiles:created_by(id, full_name, avatar_url), event_comments(id, body, created_at, profiles:user_id(id, full_name, avatar_url))`)
      .eq('id', params.eventId)
      .eq('calendar_id', params.id)
      .single();

    if (error) return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH /api/calendars/[id]/events/[eventId]
export async function PATCH(request: NextRequest, { params }: { params: { id: string; eventId: string } }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = updateEventSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.errors }, { status: 400 });

    const { data, error } = await supabase
      .from('calendar_events')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', params.eventId)
      .eq('calendar_id', params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/calendars/[id]/events/[eventId]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; eventId: string } }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', params.eventId)
      .eq('calendar_id', params.id);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, message: 'Event deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
