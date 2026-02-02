import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { InvitationService, RSVPResponse } from '@/services/invitation-service';
import { RSVPStatus } from '@/types/calendar';

export const dynamic = 'force-dynamic'

/**
 * GET /api/calendar/rsvp/[token] - Get invitation details by token (public)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createClient();

    const { data: invitation, error } = await supabase
      .from('calendar_invitations')
      .select(`
        *,
        event:user_calendar_events(*)
      `)
      .eq('token', params.token)
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if invitation is expired
    if (InvitationService.isInvitationExpired(invitation)) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 410 } // Gone
      );
    }

    // Return public-safe invitation data
    const publicData = {
      id: invitation.id,
      eventTitle: invitation.event?.title,
      eventDescription: invitation.event?.description,
      eventStartTime: invitation.event?.start_time,
      eventEndTime: invitation.event?.end_time,
      eventLocation: invitation.event?.location,
      eventVirtualMeetingUrl: invitation.event?.virtual_meeting_url,
      inviterName: invitation.inviter_name,
      inviterEmail: invitation.inviter_email,
      inviteeName: invitation.invitee_name,
      message: invitation.message,
      rsvpStatus: invitation.rsvp_status,
      sentAt: invitation.sent_at,
      expiresAt: invitation.expires_at,
      hasResponded: invitation.response_at != null
    };

    return NextResponse.json({
      success: true,
      data: publicData
    });

  } catch (error) {
    console.error('RSVP GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/rsvp/[token] - Respond to invitation (public)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createClient();
    const body = await request.json();

    const {
      rsvpStatus,
      attendeeName,
      attendeeInfo
    } = body;

    if (!rsvpStatus || !['accepted', 'declined', 'tentative'].includes(rsvpStatus)) {
      return NextResponse.json(
        { error: 'Valid RSVP status is required (accepted, declined, tentative)' },
        { status: 400 }
      );
    }

    // Get the invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('calendar_invitations')
      .select(`
        *,
        event:user_calendar_events(*)
      `)
      .eq('token', params.token)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if invitation is expired
    if (InvitationService.isInvitationExpired(invitation)) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 410 }
      );
    }

    const response: RSVPResponse = {
      invitationId: invitation.id,
      rsvpStatus: rsvpStatus as RSVPStatus,
      attendeeInfo
    };

    // Process the RSVP response
    const updatedInvitation = InvitationService.processRSVPResponse(invitation, response);

    // Update invitation in database
    const updateData: any = {
      rsvp_status: updatedInvitation.rsvp_status,
      response_at: updatedInvitation.response_at,
      updated_at: updatedInvitation.updated_at,
      status: 'delivered' // Mark as delivered since they responded
    };

    // Update attendee name if provided
    if (attendeeName && attendeeName.trim()) {
      updateData.invitee_name = attendeeName.trim();
    }

    // Store attendee info if provided
    if (attendeeInfo) {
      updateData.attendee_info = JSON.stringify(attendeeInfo);
    }

    const { error: updateError } = await supabase
      .from('calendar_invitations')
      .update(updateData)
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error updating invitation RSVP:', updateError);
      return NextResponse.json(
        { error: 'Failed to save RSVP response' },
        { status: 500 }
      );
    }

    // Update or create attendee record in the event
    if (rsvpStatus === 'accepted' || rsvpStatus === 'tentative') {
      const attendee = InvitationService.createAttendeeFromInvitation({
        ...invitation,
        rsvp_status: rsvpStatus,
        response_at: new Date().toISOString(),
        invitee_name: attendeeName || invitation.invitee_name,
        attendee_info: attendeeInfo ? JSON.stringify(attendeeInfo) : null
      });

      // Here you would update the event's attendees list
      // For now, we'll just log it
      console.log('Attendee to add/update:', attendee);
    }

    // Send confirmation based on response
    let message = '';
    switch (rsvpStatus) {
      case 'accepted':
        message = `Thank you for accepting the invitation to "${invitation.event?.title}"! We look forward to seeing you there.`;
        break;
      case 'declined':
        message = `Thank you for responding. We're sorry you can't make it to "${invitation.event?.title}".`;
        break;
      case 'tentative':
        message = `Thank you for your response to "${invitation.event?.title}". We hope you'll be able to join us!`;
        break;
    }

    return NextResponse.json({
      success: true,
      data: {
        rsvpStatus,
        eventTitle: invitation.event?.title,
        eventStartTime: invitation.event?.start_time,
        message
      },
      message: 'RSVP response recorded successfully'
    });

  } catch (error) {
    console.error('RSVP POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}