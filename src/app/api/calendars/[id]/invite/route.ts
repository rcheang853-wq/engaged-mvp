import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/dev-auth';
import { z } from 'zod';
import { sendEmail } from '@/lib/email/send';
import { getCalendarInviteEmailHtml, getCalendarInviteEmailText } from '@/lib/email/templates/calendar-invite';

export const dynamic = 'force-dynamic';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['viewer', 'editor']).default('viewer'),
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
    const role = parsed.data.role;

    const { data: membership } = await supabase
      .from('calendar_members')
      .select('role')
      .eq('calendar_id', calendarId)
      .eq('user_id', user.id)
      .maybeSingle();

    const isOwner = membership?.role === 'owner';
    if (!isOwner) {
      return NextResponse.json({ success: false, error: 'Only owners can send invites' }, { status: 403 });
    }

    // Prevent duplicate pending invites
    const invitesTable = (supabase as any).from('calendar_invites');

    const { data: existing } = await invitesTable
      .select('id')
      .eq('calendar_id', calendarId)
      .eq('invited_email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json({ success: false, error: 'Invite already pending' }, { status: 409 });
    }

    const { data, error } = await invitesTable
      .insert({
        calendar_id: calendarId,
        invited_email: email,
        invited_by: user.id,
        role,
        status: 'pending',
      })
      .select('id, calendar_id, invited_email, role, status, created_at, expires_at')
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

    // Email is best-effort; invite creation is the source of truth.
    const emailResult = await sendEmail({
      to: email,
      subject: `${emailParams.inviterName} invited you to ${emailParams.calendarName}`,
      html: getCalendarInviteEmailHtml(emailParams),
      text: getCalendarInviteEmailText(emailParams),
    });

    const emailSent = !!emailResult.success;
    const message = emailSent
      ? 'Invite created and email sent'
      : process.env.RESEND_API_KEY
        ? 'Invite created; email delivery failed'
        : 'Invite saved; email not sent (RESEND_API_KEY missing)';

    if (!emailSent) {
      console.warn('[POST /api/calendars/:id/invite] Email not sent:', emailResult.error);
    }

    return NextResponse.json({ success: true, data, emailSent, message }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
