import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category_main: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime().optional(),
  all_day: z.boolean().optional().default(false),
  location: z.string().max(500).optional(),
  discoverable_by_others: z.boolean().optional().default(false),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

// GET /api/calendars/[id]/events — list events (with optional date range)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );

    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    let query = supabase
      .from('calendar_events')
      .select(`*, profiles:created_by(id, full_name, avatar_url)`)
      .eq('calendar_id', id)
      .order('start_at');

    if (start) query = query.gte('start_at', start);
    if (end) query = query.lte('start_at', end);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// POST /api/calendars/[id]/events — create event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );

    const { id } = await params;

    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { success: false, error: parsed.error.issues },
        { status: 400 }
      );

    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        calendar_id: id,
        created_by: user.id,
        title: parsed.data.title,
        start_at: parsed.data.start_at,
        all_day: parsed.data.all_day ?? false,
        description: parsed.data.description ?? null,
        category_main: parsed.data.category_main ?? null,
        tags: parsed.data.tags ?? [],
        end_at: parsed.data.end_at ?? null,
        location: parsed.data.location ?? null,
        discoverable_by_others: parsed.data.discoverable_by_others ?? false,
        color: parsed.data.color ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
