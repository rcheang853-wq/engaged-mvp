import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { InvitationService, InvitationData } from '@/services/invitation-service';

export const dynamic = 'force-dynamic'

/**
 * GET /api/calendar/invitations - Get invitations for user
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'sent' | 'received'
    const eventId = searchParams.get('eventId');

    let query = supabase.from('calendar_invitations').select(`
      *,
      event:user_calendar_events(*)
    `);

    if (type === 'sent') {
      query = query.eq('inviter_user_id', user.id);
    } else if (type === 'received') {
      query = query.or(`invitee_user_id.eq.${user.id},invitee_email.eq.${user.email}`);
    } else {
      // Get both sent and received
      query = query.or(
        `inviter_user_id.eq.${user.id},invitee_user_id.eq.${user.id},invitee_email.eq.${user.email}`
      );
    }

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    query = query.order('created_at', { ascending: false });

    const { data: invitations, error } = await query;

    if (error) {
      console.error('Error fetching invitations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: invitations || []
    });

  } catch (error) {
    console.error('Invitations GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/invitations - Send invitations for an event
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      eventId,
      invitees, // Array of { email: string, name?: string, userId?: string }
      message,
      expiresIn // hours
    } = body;

    if (!eventId || !invitees || !Array.isArray(invitees) || invitees.length === 0) {
      return NextResponse.json(
        { error: 'Event ID and invitees array are required' },
        { status: 400 }
      );
    }

    // Get the event details
    const { data: event, error: eventError } = await supabase
      .from('user_calendar_events')
      .select('*')
      .eq('id', eventId)
      .eq('user_id', user.id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found or you do not have permission to invite attendees' },
        { status: 404 }
      );
    }

    // Get user profile for organizer info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const inviterName = profile?.full_name || user.email || 'Unknown';

    const createdInvitations = [];
    const errors: string[] = [];

    // Create invitations for each invitee
    for (const invitee of invitees) {
      try {
        if (!invitee.email) {
          errors.push(`Missing email for invitee: ${JSON.stringify(invitee)}`);
          continue;
        }

        // Check if invitation already exists
        const { data: existingInvitation } = await supabase
          .from('calendar_invitations')
          .select('id')
          .eq('event_id', eventId)
          .eq('invitee_email', invitee.email)
          .single();

        if (existingInvitation) {
          errors.push(`Invitation already exists for ${invitee.email}`);
          continue;
        }

        const invitationData: InvitationData = {
          eventId,
          inviterUserId: user.id,
          inviterName,
          inviterEmail: user.email || '',
          inviteeEmail: invitee.email,
          inviteeName: invitee.name,
          inviteeUserId: invitee.userId,
          message,
          expiresAt: expiresIn ? new Date(Date.now() + (expiresIn * 60 * 60 * 1000)) : undefined
        };

        const invitation = await InvitationService.createInvitation(invitationData);

        // Save to database
        const { data: savedInvitation, error: saveError } = await supabase
          .from('calendar_invitations')
          .insert({
            id: invitation.id,
            event_id: invitation.event_id,
            inviter_user_id: invitation.inviter_user_id,
            inviter_name: invitation.inviter_name,
            inviter_email: invitation.inviter_email,
            invitee_email: invitation.invitee_email,
            invitee_name: invitation.invitee_name,
            invitee_user_id: invitation.invitee_user_id,
            status: invitation.status,
            rsvp_status: invitation.rsvp_status,
            message: invitation.message,
            sent_at: invitation.sent_at,
            expires_at: invitation.expires_at,
            token: invitation.token,
            reminders_sent: invitation.reminders_sent
          })
          .select()
          .single();

        if (saveError) {
          console.error(`Error saving invitation for ${invitee.email}:`, saveError);
          errors.push(`Failed to save invitation for ${invitee.email}: ${saveError.message}`);
          continue;
        }

        createdInvitations.push(savedInvitation);

        // Here you would typically send the email
        // For now, we'll just mark it as sent
        await supabase
          .from('calendar_invitations')
          .update({
            status: 'sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', invitation.id);

      } catch (inviteeError) {
        console.error(`Error creating invitation for ${invitee.email}:`, inviteeError);
        errors.push(`Failed to create invitation for ${invitee.email}: ${inviteeError}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        invitations: createdInvitations,
        successCount: createdInvitations.length,
        errorCount: errors.length,
        errors
      },
      message: `Successfully created ${createdInvitations.length} invitation(s)`
    });

  } catch (error) {
    console.error('Invitations POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/calendar/invitations - Update invitation status
 */
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { invitationId, status, rsvpStatus } = body;

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (status) updateData.status = status;
    if (rsvpStatus) {
      updateData.rsvp_status = rsvpStatus;
      updateData.response_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('calendar_invitations')
      .update(updateData)
      .eq('id', invitationId)
      .or(`inviter_user_id.eq.${user.id},invitee_user_id.eq.${user.id},invitee_email.eq.${user.email}`)
      .select()
      .single();

    if (error) {
      console.error('Error updating invitation:', error);
      return NextResponse.json(
        { error: 'Failed to update invitation' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Invitation not found or you do not have permission to update it' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Invitation updated successfully'
    });

  } catch (error) {
    console.error('Invitations PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/invitations - Cancel invitation
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('id');

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    // Only the inviter can cancel invitations
    const { error } = await supabase
      .from('calendar_invitations')
      .delete()
      .eq('id', invitationId)
      .eq('inviter_user_id', user.id);

    if (error) {
      console.error('Error deleting invitation:', error);
      return NextResponse.json(
        { error: 'Failed to cancel invitation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully'
    });

  } catch (error) {
    console.error('Invitations DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}