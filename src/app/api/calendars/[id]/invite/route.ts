import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/dev-auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const inviteSchema = z.object({
  email: z.string().email(),
});

// POST /api/calendars/[id]/invite
// Owner-only (enforced via RLS). Creates a pending invite by email.
export async function POST(
  req: NextRequest,
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

    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();

    // Prevent duplicate pending invites
    const { data: existing } = await supabase
      .from('calendar_invites')
      .select('id')
      .eq('calendar_id', calendarId)
      .eq('invited_email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json({ success: false, error: 'Invite already pending' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('calendar_invites')
      .insert({
        calendar_id: calendarId,
        invited_email: email,
        invited_by: user.id,
        status: 'pending',
      })
      .select('id, calendar_id, invited_email, status, created_at, expires_at')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
