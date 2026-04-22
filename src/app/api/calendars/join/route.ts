import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const joinSchema = z.object({
  invite_code: z.string().min(1),
});

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function getCalendarByCode(inviteCode: string) {
  const db = createServiceClient();
  const { data: calendar, error } = await db
    .from('calendars')
    .select('id, name, color, default_join_role')
    .eq('invite_code', inviteCode)
    .single();

  if (error || !calendar) {
    return null;
  }

  return calendar;
}

// GET /api/calendars/join?code=XXXXXXX — preview share link state (open/join/view)
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')?.trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ success: false, error: 'Missing invite code' }, { status: 400 });
    }

    const calendar = await getCalendarByCode(code);
    if (!calendar) {
      return NextResponse.json({ success: false, error: 'Invalid invite code' }, { status: 404 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        success: true,
        data: {
          code,
          calendar,
          permission: 'viewer',
          state: 'open',
          requires_auth: true,
        },
      });
    }

    const { data: existingMembership } = await supabase
      .from('calendar_members')
      .select('id, role')
      .eq('calendar_id', calendar.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMembership) {
      return NextResponse.json({
        success: true,
        data: {
          code,
          calendar,
          permission: existingMembership.role,
          state: 'view',
          requires_auth: false,
          already_member: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        code,
        calendar,
        permission: 'viewer',
        state: 'join',
        requires_auth: false,
        already_member: false,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/calendars/join — join a calendar by invite code
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 });

    const inviteCode = parsed.data.invite_code.trim().toUpperCase();
    const calendar = await getCalendarByCode(inviteCode);

    if (!calendar) {
      return NextResponse.json({ success: false, error: 'Invalid invite code' }, { status: 404 });
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('calendar_members')
      .select('id, role')
      .eq('calendar_id', calendar.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        data: {
          calendar,
          membership: existing,
          already_member: true,
        },
      });
    }

    // Add as viewer
    // Use service role for the membership insert to avoid RLS blocking.
    // Security model: only allow this insert after validating (1) caller is authed and (2) invite_code maps to a calendar.
    const db = createServiceClient();

    const { data, error } = await db
      .from('calendar_members')
      .insert({
        calendar_id: calendar.id,
        user_id: user.id,
        role: calendar.default_join_role ?? 'viewer',
      })
      .select('id, role')
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data: { calendar, membership: data, already_member: false } }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
