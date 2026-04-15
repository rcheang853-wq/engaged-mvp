import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/dev-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function generateInviteCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function ensureOwner(calendarId: string, userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('calendar_members')
    .select('id')
    .eq('calendar_id', calendarId)
    .eq('user_id', userId)
    .eq('role', 'owner')
    .maybeSingle();

  return !error && !!data;
}

async function createUniqueCode(db: ReturnType<typeof createServiceClient>) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const inviteCode = generateInviteCode();
    const { data: existing } = await db
      .from('calendars')
      .select('id')
      .eq('invite_code', inviteCode)
      .maybeSingle();

    if (!existing) return inviteCode;
  }

  return null;
}

// POST /api/calendars/[id]/share-link
// Owner-only: generate (or regenerate) calendar invite_code for whole-calendar sharing.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: calendarId } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await getAuthUser(supabase);

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const isOwner = await ensureOwner(calendarId, user.id);
    if (!isOwner) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const db = createServiceClient();
    const inviteCode = await createUniqueCode(db);
    if (!inviteCode) {
      return NextResponse.json({ success: false, error: 'Unable to generate invite code' }, { status: 500 });
    }

    const { data: updated, error: updateError } = await db
      .from('calendars')
      .update({ invite_code: inviteCode, updated_at: new Date().toISOString() })
      .eq('id', calendarId)
      .select('id, invite_code')
      .single();

    if (updateError || !updated) {
      const rawError = updateError?.message ?? 'Update failed';
      const isMissingInviteCode = rawError.includes('invite_code') && rawError.includes('does not exist');
      return NextResponse.json(
        {
          success: false,
          error: isMissingInviteCode
            ? 'Share links require database migration: calendars.invite_code is missing'
            : rawError,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
