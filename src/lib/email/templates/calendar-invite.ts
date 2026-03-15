export function getCalendarInviteEmailHtml(params: {
  inviterName: string;
  calendarName: string;
  acceptUrl: string;
  expiresInDays: number;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calendar Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); padding: 40px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                📅 You've been invited!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #374151;">
                Hi there! 👋
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #374151;">
                <strong style="color: #111827;">${params.inviterName}</strong> has invited you to collaborate on the calendar <strong style="color: #111827;">"${params.calendarName}"</strong>.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6; border-radius: 12px; padding: 24px; margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #6B7280;">
                      Accept this invitation to view and manage events together.
                    </p>
                    <a href="${params.acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 20px; color: #6B7280;">
                <strong style="color: #374151;">What you can do:</strong>
              </p>
              <ul style="margin: 0 0 24px 0; padding-left: 20px; font-size: 14px; line-height: 22px; color: #6B7280;">
                <li style="margin-bottom: 8px;">View all calendar events</li>
                <li style="margin-bottom: 8px;">Add comments to events</li>
                <li style="margin-bottom: 8px;">Stay in sync with your team</li>
              </ul>

              <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 20px; color: #9CA3AF;">
                This invitation expires in <strong>${params.expiresInDays} days</strong>.
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #9CA3AF;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; line-height: 18px; color: #9CA3AF; word-break: break-all;">
                ${params.acceptUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 24px 32px; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 8px 0; font-size: 12px; line-height: 18px; color: #6B7280; text-align: center;">
                Sent from <strong>Engage Calendar</strong>
              </p>
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #9CA3AF; text-align: center;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function getCalendarInviteEmailText(params: {
  inviterName: string;
  calendarName: string;
  acceptUrl: string;
  expiresInDays: number;
}): string {
  return `
You've been invited!

${params.inviterName} has invited you to collaborate on the calendar "${params.calendarName}".

Accept this invitation to view and manage events together.

${params.acceptUrl}

What you can do:
- View all calendar events
- Add comments to events
- Stay in sync with your team

This invitation expires in ${params.expiresInDays} days.

---
Sent from Engage Calendar
If you didn't expect this invitation, you can safely ignore this email.
  `.trim();
}
