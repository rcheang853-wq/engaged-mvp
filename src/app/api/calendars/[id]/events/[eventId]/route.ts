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
  discoverable_by_others: z.boolean().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  category_main: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

// GET /api/calendars/[id]/events/[eventId]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; eventId: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id, eventId } = await params;

    const { data, error } = await supabase
      .from('calendar_events')
      .select(`*, profiles:created_by(id, full_name, avatar_url), event_comments(id, body, created_at, profiles:user_id(id, full_name, avatar_url))`)
      .eq('id', eventId)
      .eq('calendar_id', id)
      .single();

    if (error) return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH /api/calendars/[id]/events/[eventId]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; eventId: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id, eventId } = await params;
    const body = await request.json();
    const parsed = updateEventSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 });

    const { data, error } = await supabase
      .from('calendar_events')
      .update({
        updated_at: new Date().toISOString(),
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description ?? null }),
        ...(parsed.data.start_at !== undefined && { start_at: parsed.data.start_at }),
        ...(parsed.data.end_at !== undefined && { end_at: parsed.data.end_at ?? null }),
        ...(parsed.data.all_day !== undefined && { all_day: parsed.data.all_day }),
        ...(parsed.data.location !== undefined && { location: parsed.data.location ?? null }),
        ...(parsed.data.discoverable_by_others !== undefined && { discoverable_by_others: parsed.data.discoverable_by_others }),
        ...(parsed.data.color !== undefined && { color: parsed.data.color ?? null }),
        ...(parsed.data.category_main !== undefined && { category_main: parsed.data.category_main ?? null }),
        ...(parsed.data.tags !== undefined && { tags: parsed.data.tags ?? [] }),
      })
      .eq('id', eventId)
      .eq('calendar_id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/calendars/[id]/events/[eventId]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; eventId: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id, eventId } = await params;
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('calendar_id', id);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, message: 'Event deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
