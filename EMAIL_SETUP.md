# Email Setup Guide

This app uses **Resend** to send professional invitation emails.

## 1. Create Resend Account

1. Go to https://resend.com/signup
2. Sign up (free tier: 3,000 emails/month, 100 emails/day)
3. Verify your email address

## 2. Get API Key

1. Go to https://resend.com/api-keys
2. Click **"Create API Key"**
3. Name it: `Engage Calendar Production`
4. Copy the API key (starts with `re_`)

## 3. Add Environment Variables

### Local Development (`.env.local`):
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=Engage Calendar <noreply@yourdomain.com>
```

### Vercel Production:
1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add:
   - `RESEND_API_KEY` = `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - `EMAIL_FROM` = `Engage Calendar <noreply@yourdomain.com>`
3. Click **Save**
4. Redeploy your app

## 4. Configure Sending Domain (Recommended)

For professional emails without "via resend.dev" warning:

1. Go to https://resend.com/domains
2. Click **"Add Domain"**
3. Enter your domain (e.g., `engage-calendar.com`)
4. Add the DNS records Resend provides to your domain registrar
5. Wait for verification (usually < 5 minutes)
6. Update `EMAIL_FROM` to use your domain:
   ```bash
   EMAIL_FROM=Engage Calendar <noreply@engage-calendar.com>
   ```

## 5. Test

1. Invite someone to a calendar
2. Check their email inbox
3. Email should arrive within seconds

## Troubleshooting

### Email not sending?
- Check Resend dashboard → Logs: https://resend.com/emails
- Verify `RESEND_API_KEY` is set in Vercel
- Check server logs for errors

### Email going to spam?
- Add your domain and verify DNS records
- Set up SPF, DKIM, DMARC (Resend provides these automatically for verified domains)

### Free tier limits exceeded?
- Upgrade to Resend Pro: https://resend.com/pricing
- Or throttle invites (max 100/day on free tier)

## Email Template

The invitation email includes:
- Professional gradient header
- Clear call-to-action button
- List of member permissions
- Expiration notice (14 days)
- Plain text fallback for email clients that don't support HTML
