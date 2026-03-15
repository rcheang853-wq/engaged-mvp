import { Resend } from 'resend';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

export async function sendEmail(params: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;

  // If no API key, log warning and return (don't fail the invite)
  if (!apiKey) {
    console.warn('[sendEmail] RESEND_API_KEY not set - email not sent');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const resend = new Resend(apiKey);
    
    const result = await resend.emails.send({
      from: params.from || process.env.EMAIL_FROM || 'Engage Calendar <noreply@engage-calendar.com>',
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error('[sendEmail] Error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}
