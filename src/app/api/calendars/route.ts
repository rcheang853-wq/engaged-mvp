import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/dev-auth';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function createAuthedDbClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const createCalendarSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

async function ensurePersonalCalendar(
  supabase: any,
  user: { id: string; email?: string | null; user_metadata?: any }
) {
  // Best-effort: ensure profile exists for new users
  try {
    await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          full_name: user.user_metadata?.full_name ?? 'User',
          avatar_url: null,
        },
        { onConflict: 'id' }
      );
  } catch {
    // ignore
  }

  const { data: existing, error: exErr } = await supabase
    .from('calendars')
    .select('id')
    .eq('type', 'personal')
    .eq('created_by', user.id)
    .limit(1);

  if (exErr) throw exErr;
  if (existing && existing.length > 0) return existing[0].id;

  const { data: cal, error: calErr } = await supabase
    .from('calendars')
    .insert({
      name: 'Personal',
      description: null,
      color: '#3B82F6',
      created_by: user.id,
      type: 'personal',
    })
    .select()
    .single();
  if (calErr) throw calErr;

  const { error: memErr } = await supabase
    .from('calendar_members')
    .upsert(
      { calendar_id: cal.id, user_id: user.id, role: 'owner' },
      { onConflict: 'calendar_id,user_id' }
    );
  if (memErr) throw memErr;

  return cal.id;
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await getAuthUser(supabase);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Force DB calls to include access token (prevents intermittent anon-role RLS failures on mobile)
    const db = createAuthedDbClient(session.access_token);

    await ensurePersonalCalendar(db, user as any);

    const { data, error } = await db
      .from('calendars')
      .select('*, calendar_members!inner(user_id, role)')
      .eq('calendar_members.user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await getAuthUser(supabase);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Force DB calls to include access token (prevents intermittent anon-role RLS failures on mobile)
    const db = createAuthedDbClient(session.access_token);

    await ensurePersonalCalendar(db, user as any);

    const body = await request.json();
    const parsed = createCalendarSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors },
        { status: 400 }
      );
    }

    const { data: calendar, error: calErr } = await db
      .from('calendars')
      .insert({ ...parsed.data, created_by: user.id, type: 'shared' })
      .select()
      .single();
    if (calErr) throw calErr;

    const { error: memErr } = await db
      .from('calendar_members')
      .upsert(
        { calendar_id: calendar.id, user_id: user.id, role: 'owner' },
        { onConflict: 'calendar_id,user_id' }
      );
    if (memErr) throw memErr;

    return NextResponse.json({ success: true, data: calendar }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
