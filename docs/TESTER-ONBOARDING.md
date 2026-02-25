# Tester Onboarding (Engaged)

## URL
- Local dev: http://localhost:3000
- Tailscale/LAN: http://100.106.43.20:3000 (if enabled)

## Account creation (beta mode: email confirmation OFF)
1. Go to `/auth/signup`
2. Enter name, email, password
3. You should land in `/calendars`

If you get bounced back to sign-in, refresh once.

## First things to test
### 1) Discover
- `/discover` list loads
- Open an event detail
- Save/Unsave
- Add to calendar (creates a calendar event)

### 2) Calendars
- Create calendar
- Invite/join flow (if enabled)
- Create/edit/delete events

### 3) Account
- `/account` loads
- Sign out

## Known limitations (beta)
- Password reset emails may not deliver unless SMTP is configured in Supabase.
- Google OAuth button is present but may not be configured yet.
