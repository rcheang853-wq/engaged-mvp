import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/dev-auth';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}


const updateCalendarSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

// GET /api/calendars/[id] — get single calendar + members
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Use service role for DB read — user is already validated.
    // Scope query to calendars where the user is a member.
    const db = createServiceClient();

    const { data, error } = await db
      .from('calendars')
      .select(
        `*,
         calendar_members!inner(id, user_id, role, joined_at, profiles(id, full_name, avatar_url, email))`
      )
      .eq('id', id)
      .eq('calendar_members.user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Calendar not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// PATCH /api/calendars/[id] — update calendar (owner only via RLS)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const body = await request.json();
    const parsed = updateCalendarSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { success: false, error: parsed.error.message },
        { status: 400 }
      );

    const { data, error } = await supabase
      .from('calendars')
      .update({
        updated_at: new Date().toISOString(),
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description ?? null }),
        ...(parsed.data.color !== undefined && { color: parsed.data.color }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// DELETE /api/calendars/[id] — delete calendar (owner only via RLS)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const { error } = await supabase.from('calendars').delete().eq('id', id);
    if (error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    return NextResponse.json({ success: true, message: 'Calendar deleted' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
