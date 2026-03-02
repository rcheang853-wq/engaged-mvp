import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/dev-auth';

export const dynamic = 'force-dynamic';

// GET /api/me/invites
// Returns pending calendar invites for the logged-in user's email.
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await getAuthUser(supabase);

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Read profile email (source of truth for invite matching)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.email) {
      return NextResponse.json({ success: false, error: 'Profile missing email' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('calendar_invites')
      .select('id, calendar_id, invited_email, invited_by, status, created_at, expires_at, calendars(id, name, color)')
      .eq('invited_email', profile.email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
