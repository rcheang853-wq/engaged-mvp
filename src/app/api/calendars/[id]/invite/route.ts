import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/dev-auth';
import { z } from 'zod';
import { sendEmail } from '@/lib/email/send';
import { getCalendarInviteEmailHtml, getCalendarInviteEmailText } from '@/lib/email/templates/calendar-invite';

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

    // Fetch calendar + inviter details for email
    const { data: calendar } = await supabase
      .from('calendars')
      .select('name')
      .eq('id', calendarId)
      .single();

    const { data: inviter } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    // Send invitation email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://engage-calendar-nu.vercel.app';
    const acceptUrl = `${siteUrl}/account/invites`;
    const expiresInDays = 14;

    const emailParams = {
      inviterName: inviter?.full_name || inviter?.email || 'Someone',
      calendarName: calendar?.name || 'Shared Calendar',
      acceptUrl,
      expiresInDays,
    };

    // Send email (non-blocking - don't fail invite creation if email fails)
    sendEmail({
      to: email,
      subject: `${emailParams.inviterName} invited you to ${emailParams.calendarName}`,
      html: getCalendarInviteEmailHtml(emailParams),
      text: getCalendarInviteEmailText(emailParams),
    }).catch((err) => {
      console.error('[POST /api/calendars/:id/invite] Email send error:', err);
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
