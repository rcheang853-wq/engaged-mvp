import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/dev-auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateMemberSchema = z.object({
  role: z.enum(['viewer', 'editor']),
});

async function ensureOwner(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, calendarId: string, userId: string) {
  const { data } = await supabase
    .from('calendar_members')
    .select('role')
    .eq('calendar_id', calendarId)
    .eq('user_id', userId)
    .maybeSingle();

  return data?.role === 'owner';
}

async function countOwners(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, calendarId: string) {
  const { count, error } = await supabase
    .from('calendar_members')
    .select('id', { count: 'exact', head: true })
    .eq('calendar_id', calendarId)
    .eq('role', 'owner');

  if (error) throw error;
  return count ?? 0;
}

// PATCH /api/calendars/[id]/members/[userId]
// Owner-only role update. Owners cannot be downgraded through the MVP UI/API.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await getAuthUser(supabase);

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: calendarId, userId } = await params;
    const body = await req.json();
    const parsed = updateMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
    }

    const isOwner = await ensureOwner(supabase, calendarId, user.id);
    if (!isOwner) {
      return NextResponse.json({ success: false, error: 'Only owners can update members' }, { status: 403 });
    }

    const { data: targetMember, error: targetError } = await supabase
      .from('calendar_members')
      .select('role')
      .eq('calendar_id', calendarId)
      .eq('user_id', userId)
      .maybeSingle();

    if (targetError || !targetMember) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    if (targetMember.role === 'owner') {
      return NextResponse.json({ success: false, error: 'Owners cannot be downgraded' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('calendar_members')
      .update({ role: parsed.data.role })
      .eq('calendar_id', calendarId)
      .eq('user_id', userId)
      .select('id, calendar_id, user_id, role, joined_at, profiles(id, full_name, avatar_url, email)')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/calendars/[id]/members/[userId]
// Owner can remove anyone; user can remove self (enforced via RLS).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await getAuthUser(supabase);

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: calendarId, userId } = await params;

    const isSelfLeave = user.id === userId;
    const isOwner = await ensureOwner(supabase, calendarId, user.id);

    if (!isSelfLeave && !isOwner) {
      return NextResponse.json({ success: false, error: 'Only owners can remove members' }, { status: 403 });
    }

    const { data: targetMember, error: targetError } = await supabase
      .from('calendar_members')
      .select('role')
      .eq('calendar_id', calendarId)
      .eq('user_id', userId)
      .maybeSingle();

    if (targetError || !targetMember) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    if (targetMember.role === 'owner' && (await countOwners(supabase, calendarId)) <= 1) {
      return NextResponse.json({ success: false, error: 'Cannot remove the last owner' }, { status: 400 });
    }

    const { error } = await supabase
      .from('calendar_members')
      .delete()
      .eq('calendar_id', calendarId)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
