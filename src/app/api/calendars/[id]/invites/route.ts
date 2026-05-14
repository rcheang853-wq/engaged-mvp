import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/dev-auth';

export const dynamic = 'force-dynamic';

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// GET /api/calendars/[id]/invites
// Owner-only list of pending calendar invites for Calendar Settings.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: calendarId } = await params;

    const { data: membership } = await supabase
      .from('calendar_members')
      .select('role')
      .eq('calendar_id', calendarId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membership?.role !== 'owner') {
      return NextResponse.json({ success: false, error: 'Only owners can view pending invites' }, { status: 403 });
    }

    const db = createServiceClient();
    const { data: invites, error } = await db
      .from('calendar_invites')
      .select('id, calendar_id, invited_email, invited_by, role, status, created_at, expires_at')
      .eq('calendar_id', calendarId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    const emails = Array.from(new Set((invites ?? []).map((invite) => invite.invited_email).filter(Boolean)));
    const { data: profiles } = emails.length
      ? await db
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('email', emails)
      : { data: [] };

    const profilesByEmail = new Map((profiles ?? []).map((profile) => [profile.email?.toLowerCase(), profile]));
    const data = (invites ?? []).map((invite) => ({
      ...invite,
      profile: profilesByEmail.get(invite.invited_email?.toLowerCase()) ?? null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
