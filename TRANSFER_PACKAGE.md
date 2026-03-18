# 🚀 ENGAGED APP - DEVELOPMENT TRANSFER PACKAGE

**Transfer Date:** 2026-03-18  
**From:** Geek (direct session)  
**To:** Development Team Group (Engaged topic)  
**GitHub Repos:**
- Main: https://github.com/rcheang853-wq/engaged-mvp
- Mirror: https://github.com/rcheang853-wq/engage-calendar

---

## 📦 PROJECT OVERVIEW

**What:** Event discovery calendar app for Macau/HK/GBA  
**Stack:** Next.js 15 + Supabase + TypeScript + Tailwind  
**Monetization:** Pro membership (HKD 38/month)  
**Key Features:**
- Timable-style Discover page (Trending/Nearby/Top 10)
- AI Matching swipe interface (Tinder-like)
- Calendar-first UX with conflict detection
- Organizer submission portal
- Web scraping pipeline (Playwright + Firecrawl)

**PRD:** See `prd.md` in repo root for full product requirements.

---

## ✅ CURRENT STATUS

### Completed Phases
- ✅ **Phase 1A:** Core event discovery + calendar integration
- ✅ **Database:** Supabase schema with RLS policies
- ✅ **Auth:** Email + OAuth (Google/Facebook/GitHub)
- ✅ **Scraping:** Multi-source pipeline with ETag caching
- ✅ **Membership:** Stripe integration for Pro tier
- ✅ **Search:** Event filtering + geolocation

### In Progress
- 🔄 **UI Polish** (user requested this next)
- 🔄 **Email notifications** (Resend integration)

### Not Started
- ⏳ Push notifications
- ⏳ Google Calendar sync
- ⏳ Mobile app (React Native)

**Docs:**
- `PHASE_1A_COMPLETE.md` - Completion report
- `IMPLEMENTATION_DETAILS.md` - Architecture deep dive
- `FIXES_SUMMARY.md` - Bug fixes log
- `todo.md` - Backlog

---

## 🛠️ TECH STACK

| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + OAuth |
| Payments | Stripe |
| Email | Resend API |
| Styling | Tailwind CSS + shadcn/ui |
| Scraping | Playwright + Firecrawl |
| Job Queue | Bull + Redis |
| Deployment | Vercel |

**Dependencies:** See `package.json`

---

## 🔧 ENVIRONMENT SETUP

### Prerequisites
- Node.js 18+
- npm/pnpm/yarn
- Supabase account
- Stripe account (test mode)
- Resend account (for emails)

### Setup Steps

1. **Clone & Install**
   ```bash
   git clone https://github.com/rcheang853-wq/engaged-mvp.git
   cd engaged-mvp
   npm install
   ```

2. **Environment Variables**
   - Copy `.env.example` → `.env.local`
   - Fill in required keys (see API Keys section below)

3. **Database**
   ```bash
   # Run migrations in Supabase dashboard
   # OR use supabase CLI
   npx supabase db push
   ```

4. **Dev Server**
   ```bash
   npm run dev
   # Opens http://localhost:3000
   ```

---

## 🔑 API KEYS NEEDED

### Required (App Won't Work Without These)

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL` - Project URL (find in Supabase dashboard)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon key (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (private, server-only)

**Stripe:**
- `STRIPE_PUBLISHABLE_KEY` - Test mode publishable key
- `STRIPE_SECRET_KEY` - Test mode secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (for payments)
- `STRIPE_PRO_PRICE_ID` - Price ID for Pro membership

### Optional (Feature-Specific)

**Email (Resend):**
- `RESEND_API_KEY` - For password reset & notifications
- `EMAIL_FROM` - Sender email (must be verified domain)

**OAuth (Social Login):**
- `GOOGLE_CLIENT_ID` / `GOOGLE_SECRET`
- `FACEBOOK_CLIENT_ID` / `FACEBOOK_SECRET`
- `GITHUB_CLIENT_ID` / `GITHUB_SECRET`

**Scraping (Fallback):**
- `FIRECRAWL_API_KEY` - For complex scraping tasks

**Redis (Job Queue):**
- `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` - For Bull queues

### Where to Get Keys

- **Supabase:** https://supabase.com/dashboard → Project Settings → API
- **Stripe:** https://dashboard.stripe.com/test/apikeys
- **Resend:** https://resend.com/api-keys
- **OAuth:** Google/Facebook/GitHub developer consoles

**Note:** Production keys are already configured. Ask user for access or create test accounts.

---

## 📁 KEY FILE LOCATIONS

### Core App
- `src/app/` - Next.js app router pages
- `src/components/` - React components
- `src/lib/` - Utilities & API clients
- `src/types/` - TypeScript types

### Features
- `src/app/(auth)/` - Login/signup pages
- `src/app/discover/` - Main event discovery page
- `src/app/calendar/` - Calendar views
- `src/app/match/` - AI matching swipe interface
- `src/app/organizer/` - Event submission portal

### Backend
- `supabase/migrations/` - Database schema migrations
- `scripts/` - Scraping & maintenance scripts
- `workers/` - Background job workers (Bull)

### Config
- `.env.local` - Environment variables (DO NOT COMMIT)
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind styling
- `tsconfig.json` - TypeScript config

---

## 🎯 DEVELOPMENT WORKFLOW

### Branching Strategy
- `master` - Production-ready code
- `development` - Integration branch (if needed)
- `feature/*` - Feature branches (create from master)

### Task Workflow
1. **Geek assigns task** → sends Task Packet to Ralph
2. **Ralph works** → creates feature branch, implements, tests
3. **Ralph reports** → sends Work Report when done
4. **Geek reviews** → checks diff, runs tests, reviews against spec
5. **Geek merges** → if pass, merge to master; if fail, send revision (max 2 tries)

### Task Packet Format
```
---
TASK: [one sentence — what to build]
REPO: D:\dev\Engage_Timetree
BRANCH: feature/[task-name]
CONSTRAINTS: [tech stack, forbidden changes, "don't touch X"]
DONE WHEN: [testable criteria + commands that must pass]
TOOL: [claude-code | opencode | codex | direct]
---
```

---

## 🚨 IMPORTANT NOTES

### Security
- **Never commit `.env.local`** - contains secrets
- RLS policies are enabled - test with multiple users
- Stripe webhooks need HTTPS (use ngrok for local testing)

### Database
- Supabase schema is source of truth
- Use migrations for schema changes (don't edit directly in dashboard)
- Test RLS policies in SQL editor before deploying

### Deployment
- Vercel auto-deploys from `master` branch
- Environment variables must be set in Vercel dashboard
- Preview deployments available on PRs

### Known Issues
- Redis loop fix applied (see `fix-redis-loop.patch`)
- Email delivery requires Resend domain verification
- OAuth redirect URLs must match `.env` settings

---

## 📚 ESSENTIAL DOCS TO READ

1. **prd.md** - Product requirements & vision
2. **IMPLEMENTATION_DETAILS.md** - Architecture & design decisions
3. **PHASE_1A_COMPLETE.md** - What's been built so far
4. **todo.md** - Backlog & future work
5. **.env.example** - Required environment variables

---

## 🤝 HANDOFF NOTES

- **Previous work:** UI foundation complete, user requested polish next
- **Active tasks:** None currently (clean slate for team)
- **Blocked items:** None
- **User preference:** Work in group chat topic "Engaged", Geek reviews PRs

**Workflow:**
- Ralph receives tasks via Telegram in group chat
- Ralph works using preferred tool (claude-code/opencode/codex)
- Ralph reports back to group when done
- Geek reviews & merges
- User provides direction & approvals

---

## 🎬 NEXT STEPS

1. ✅ **Backup complete** - Code pushed to GitHub
2. ✅ **Context transferred** - This document sent to group
3. ⏳ **Awaiting user direction** - User will specify next task

**Ready to build!** 🚀

---

**Questions?** Ask in the group chat. Let's ship this! 🦞
