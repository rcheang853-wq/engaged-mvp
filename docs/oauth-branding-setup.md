# Engage OAuth Branding Setup

This is the production branding checklist for removing the raw Supabase project URL from Google sign-in screens.

## Current Public App Values

- App name: `Engage`
- Production app URL: `https://engaged-mvp.vercel.app`
- Privacy policy: `https://engaged-mvp.vercel.app/privacy`
- Terms of service: `https://engaged-mvp.vercel.app/terms`
- OAuth logo: `https://engaged-mvp.vercel.app/oauth-logo.png`
- Current Supabase project ref: `hrwcwledehtkqlrzeqiq`
- Current Supabase callback: `https://hrwcwledehtkqlrzeqiq.supabase.co/auth/v1/callback`

## Google Auth Platform

In Google Cloud Console, open the project that owns the Google OAuth client used by Supabase.

### Branding

Set:

- App name: `Engage`
- User support email: your support email
- App logo: `https://engaged-mvp.vercel.app/oauth-logo.png`
- Application home page: `https://engaged-mvp.vercel.app`
- Privacy policy: `https://engaged-mvp.vercel.app/privacy`
- Terms of service: `https://engaged-mvp.vercel.app/terms`
- Authorized domain: `engaged-mvp.vercel.app`
- Developer contact email: your support email

Submit for verification if Google requires it. Google brand verification can take several business days.

### OAuth Client Redirect URIs

Keep the current Supabase callback active:

```text
https://hrwcwledehtkqlrzeqiq.supabase.co/auth/v1/callback
```

After a Supabase custom domain is verified, add the branded callback too:

```text
https://auth.yourdomain.com/auth/v1/callback
```

Do not remove the old callback until production login has been tested with the branded domain.

## Supabase Custom Domain

Preferred production auth/API domain:

```text
auth.yourdomain.com
```

Supabase custom domains require a paid plan/add-on and DNS ownership. In Supabase Dashboard:

1. Open Project Settings.
2. Open Custom Domains.
3. Add `auth.yourdomain.com`.
4. Add the DNS records Supabase gives you.
5. Wait for SSL verification.
6. Add the new Google callback URI before activating the domain.
7. Activate the custom domain.

After activation, update app environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=https://auth.yourdomain.com
NEXT_PUBLIC_SITE_URL=https://engaged-mvp.vercel.app
```

Keep the same Supabase anon and service-role keys unless Supabase rotates them.

## Why This Matters

Google displays the OAuth/auth origin to users. If the Supabase project domain is used, users see `hrwcwledehtkqlrzeqiq.supabase.co`. A branded custom domain such as `auth.engage.example` makes the login screen match the product and reduces trust friction.
