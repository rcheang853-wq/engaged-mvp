# Beta Checklist

## Must work
- [ ] Signup creates an account and lands user in `/calendars`
- [ ] Sign in works and persists session after refresh
- [ ] Sign out clears session and returns to sign-in
- [ ] `/discover` loads events
- [ ] Event detail loads
- [ ] Save/Unsave works
- [ ] Add-to-calendar works

## Nice to have
- [ ] Password reset flow (requires SMTP)
- [ ] Google OAuth (requires Google + Supabase provider config)

## Admin checklist (Supabase)
- Email confirmations OFF for beta (Option A)
- Redirect URLs include:
  - http://localhost:3000/auth/callback
  - http://100.106.43.20:3000/auth/callback
