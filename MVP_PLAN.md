# Engaged MVP Plan

This document defines the minimal scope for the Engaged MVP rewrite. It is intentionally narrow to prevent scope creep.

## Scope (Must Have)
- Auth C with Supabase
  - Email/password signup with email confirmation required before login
  - Email/password sign-in and sign-out
  - Password reset (email recovery link) + update password via recovery flow
  - Google OAuth sign-in
- Core routes only
  - /auth/signin
  - /auth/signup
  - /auth/reset-password
  - /calendar (main logged-in page)
  - /e/[shareSlug] (public event view)
- Calendar UI
  - react-big-calendar
  - Read/list events per logged-in user
- Event CRUD
  - Supabase table: events
  - Fields: title, start, end, location, notes
  - Create/update/delete/list per user
- Public share links
  - share_slug per event
  - Public view shows title/start/end + general location label
  - Notes are hidden

## Out of Scope (Explicitly Not Included)
- AI match
- Discover
- Onboarding
- Organizer portal
- Admin
- Scraping UI
- Any features not listed in Scope

## Deliverables
- Updated routes and navigation per scope
- Auth, calendar, CRUD, and public share pages
- Supabase settings documented (redirect URLs for local + prod)

## Guardrails
- Keep changes small and coherent
- Windows-compatible scripts only
