import {
  CalendarEvent,
  CalendarInvitation,
  EventAttendee,
  RSVPStatus,
  InvitationStatus
} from '@/types/calendar';

export interface InvitationData {
  eventId: string;
  inviterUserId: string;
  inviterName: string;
  inviterEmail: string;
  inviteeEmail: string;
  inviteeName?: string;
  inviteeUserId?: string;
  message?: string;
  expiresAt?: Date;
}

export interface RSVPResponse {
  invitationId: string;
  rsvpStatus: RSVPStatus;
  message?: string;
  attendeeInfo?: {
    name?: string;
    dietary?: string;
    accessibility?: string;
    notes?: string;
  };
}

export interface InvitationTemplate {
  subject: string;
  textBody: string;
  htmlBody: string;
}

export class InvitationService {
  /**
   * Create invitation for an event
   */
  static async createInvitation(invitationData: InvitationData): Promise<CalendarInvitation> {
    const invitation: CalendarInvitation = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event_id: invitationData.eventId,
      inviter_user_id: invitationData.inviterUserId,
      inviter_name: invitationData.inviterName,
      inviter_email: invitationData.inviterEmail,
      invitee_email: invitationData.inviteeEmail,
      invitee_name: invitationData.inviteeName || null,
      invitee_user_id: invitationData.inviteeUserId || null,
      status: 'pending',
      rsvp_status: 'pending',
      message: invitationData.message || null,
      sent_at: new Date().toISOString(),
      response_at: null,
      expires_at: invitationData.expiresAt?.toISOString() || null,
      reminders_sent: 0,
      last_reminder_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      token: this.generateInvitationToken(),
      attendee_info: null,
    };

    return invitation;
  }

  /**
   * Generate secure invitation token
   */
  private static generateInvitationToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Generate invitation email template
   */
  static generateInvitationTemplate(
    event: CalendarEvent,
    invitation: CalendarInvitation,
    invitationUrl: string
  ): InvitationTemplate {
    const eventStartDate = new Date(event.start_time);
    const eventEndDate = new Date(event.end_time);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    };

    const subject = `Calendar Invitation: ${event.title}`;

    const textBody = `
You've been invited to an event!

Event: ${event.title}
${event.description ? `Description: ${event.description}` : ''}
Date: ${formatDate(eventStartDate)}
Time: ${formatTime(eventStartDate)} - ${formatTime(eventEndDate)}
${event.location ? `Location: ${event.location}` : ''}
${event.virtual_meeting_url ? `Virtual Meeting: ${event.virtual_meeting_url}` : ''}

Organizer: ${invitation.inviter_name} (${invitation.inviter_email})
${invitation.message ? `Message: ${invitation.message}` : ''}

Please respond to this invitation by visiting:
${invitationUrl}

This invitation will expire on ${invitation.expires_at ? new Date(invitation.expires_at).toLocaleDateString() : 'no expiration date set'}.
    `.trim();

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calendar Invitation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e1e5e9; }
    .event-details { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .detail-row { display: flex; margin-bottom: 10px; }
    .detail-label { font-weight: 600; min-width: 100px; color: #495057; }
    .detail-value { flex: 1; }
    .buttons { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; padding: 12px 24px; margin: 0 10px; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .btn-accept { background: #28a745; color: white; }
    .btn-decline { background: #dc3545; color: white; }
    .btn-tentative { background: #ffc107; color: #212529; }
    .footer { text-align: center; color: #6c757d; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 You're Invited!</h1>
      <p>You've been invited to join an event</p>
    </div>

    <div class="content">
      <h2>${event.title}</h2>

      ${event.description ? `<p>${event.description}</p>` : ''}

      <div class="event-details">
        <div class="detail-row">
          <span class="detail-label">📅 Date:</span>
          <span class="detail-value">${formatDate(eventStartDate)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">🕒 Time:</span>
          <span class="detail-value">${formatTime(eventStartDate)} - ${formatTime(eventEndDate)}</span>
        </div>
        ${event.location ? `
        <div class="detail-row">
          <span class="detail-label">📍 Location:</span>
          <span class="detail-value">${event.location}</span>
        </div>
        ` : ''}
        ${event.virtual_meeting_url ? `
        <div class="detail-row">
          <span class="detail-label">💻 Virtual Meeting:</span>
          <span class="detail-value"><a href="${event.virtual_meeting_url}">${event.virtual_meeting_url}</a></span>
        </div>
        ` : ''}
        <div class="detail-row">
          <span class="detail-label">👤 Organizer:</span>
          <span class="detail-value">${invitation.inviter_name} (${invitation.inviter_email})</span>
        </div>
      </div>

      ${invitation.message ? `
      <div style="background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0;">
        <strong>Personal Message:</strong><br>
        ${invitation.message}
      </div>
      ` : ''}

      <div class="buttons">
        <a href="${invitationUrl}?response=accepted" class="btn btn-accept">✅ Accept</a>
        <a href="${invitationUrl}?response=tentative" class="btn btn-tentative">❓ Maybe</a>
        <a href="${invitationUrl}?response=declined" class="btn btn-decline">❌ Decline</a>
      </div>

      <p style="text-align: center; color: #6c757d;">
        Can't click the buttons? Visit: <a href="${invitationUrl}">${invitationUrl}</a>
      </p>

      ${invitation.expires_at ? `
      <p style="text-align: center; color: #dc3545; font-size: 14px;">
        ⏰ This invitation expires on ${new Date(invitation.expires_at).toLocaleDateString()}
      </p>
      ` : ''}
    </div>

    <div class="footer">
      <p>This invitation was sent via Calendar App. If you believe this was sent in error, please ignore this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return {
      subject,
      textBody,
      htmlBody,
    };
  }

  /**
   * Process RSVP response
   */
  static processRSVPResponse(
    invitation: CalendarInvitation,
    response: RSVPResponse
  ): CalendarInvitation {
    const updatedInvitation = {
      ...invitation,
      rsvp_status: response.rsvpStatus,
      response_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attendee_info: response.attendeeInfo ? JSON.stringify(response.attendeeInfo) : null,
    };

    // Update status based on RSVP
    if (response.rsvpStatus !== 'pending') {
      updatedInvitation.status = 'delivered' as InvitationStatus;
    }

    return updatedInvitation;
  }

  /**
   * Create attendee from invitation
   */
  static createAttendeeFromInvitation(invitation: CalendarInvitation): EventAttendee {
    return {
      id: `attendee_${invitation.id}`,
      userId: invitation.invitee_user_id || undefined,
      email: invitation.invitee_email,
      name: invitation.invitee_name || invitation.invitee_email,
      rsvpStatus: invitation.rsvp_status as RSVPStatus,
      isOptional: false,
      responseAt: invitation.response_at ? new Date(invitation.response_at) : undefined,
      note: invitation.attendee_info ? JSON.parse(invitation.attendee_info).notes : undefined,
    };
  }

  /**
   * Generate invitation reminder template
   */
  static generateReminderTemplate(
    event: CalendarEvent,
    invitation: CalendarInvitation,
    invitationUrl: string
  ): InvitationTemplate {
    const eventStartDate = new Date(event.start_time);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    };

    const subject = `Reminder: Please respond to invitation for ${event.title}`;

    const textBody = `
This is a friendly reminder that you haven't yet responded to the following event invitation:

Event: ${event.title}
Date: ${formatDate(eventStartDate)}
Time: ${formatTime(eventStartDate)}
${event.location ? `Location: ${event.location}` : ''}

Organizer: ${invitation.inviter_name} (${invitation.inviter_email})

Please respond by visiting:
${invitationUrl}

${invitation.expires_at ? `This invitation will expire on ${new Date(invitation.expires_at).toLocaleDateString()}.` : ''}
    `.trim();

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation Reminder</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ffc107 0%, #ff8f00 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e1e5e9; }
    .event-summary { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .buttons { text-align: center; margin: 20px 0; }
    .btn { display: inline-block; padding: 10px 20px; margin: 0 5px; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .btn-respond { background: #007bff; color: white; }
    .footer { text-align: center; color: #6c757d; font-size: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Friendly Reminder</h1>
      <p>Please respond to your event invitation</p>
    </div>

    <div class="content">
      <p>Hi there!</p>

      <p>This is a friendly reminder that you haven't yet responded to the following event invitation:</p>

      <div class="event-summary">
        <strong>${event.title}</strong><br>
        📅 ${formatDate(eventStartDate)}<br>
        🕒 ${formatTime(eventStartDate)}<br>
        ${event.location ? `📍 ${event.location}<br>` : ''}
        👤 Organizer: ${invitation.inviter_name}
      </div>

      <div class="buttons">
        <a href="${invitationUrl}" class="btn btn-respond">Respond to Invitation</a>
      </div>

      ${invitation.expires_at ? `
      <p style="text-align: center; color: #dc3545;">
        ⚠️ This invitation will expire on ${new Date(invitation.expires_at).toLocaleDateString()}
      </p>
      ` : ''}
    </div>

    <div class="footer">
      <p>This reminder was sent via Calendar App.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return {
      subject,
      textBody,
      htmlBody,
    };
  }

  /**
   * Check if invitation is expired
   */
  static isInvitationExpired(invitation: CalendarInvitation): boolean {
    if (!invitation.expires_at) {
      return false;
    }
    return new Date() > new Date(invitation.expires_at);
  }

  /**
   * Get invitation statistics
   */
  static getInvitationStats(invitations: CalendarInvitation[]) {
    const stats = {
      total: invitations.length,
      pending: 0,
      accepted: 0,
      declined: 0,
      tentative: 0,
      expired: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
    };

    const now = new Date();

    invitations.forEach(invitation => {
      // RSVP status counts
      if (invitation.rsvp_status === 'pending') stats.pending++;
      else if (invitation.rsvp_status === 'accepted') stats.accepted++;
      else if (invitation.rsvp_status === 'declined') stats.declined++;
      else if (invitation.rsvp_status === 'tentative') stats.tentative++;

      // Delivery status counts
      if (invitation.status === 'sent') stats.sent++;
      else if (invitation.status === 'delivered') stats.delivered++;
      else if (invitation.status === 'failed') stats.failed++;

      // Expiration check
      if (invitation.expires_at && now > new Date(invitation.expires_at)) {
        stats.expired++;
      }
    });

    return stats;
  }
}