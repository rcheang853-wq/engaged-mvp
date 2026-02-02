# 🚀 Supabase Setup Instructions

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign up/Login
3. Click "New Project"
4. Project details:
   - Name: `engaged-app`
   - Database Password: **SAVE THIS!**
   - Region: Choose closest to you
5. Click "Create new project" (takes ~2 minutes)

## Step 2: Get Your Credentials

1. Go to **Settings** → **API** in your project dashboard
2. Copy these 3 values:

```
Project URL: https://your-project-id.supabase.co
anon public key: eyJhbGciOiJIUzI1NiI...
service_role key: eyJhbGciOiJIUzI1NiI...
```

## Step 3: Update Your .env.local

Replace the dummy values with your real credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Step 4: Set Up Database Schema

In your Supabase dashboard:

1. Go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy and paste each migration file in order:

### Migration 1: Initial Schema
Copy the contents of `supabase/migrations/20250101000001_initial_schema.sql` and run it.

### Migration 2: RLS Policies
Copy the contents of `supabase/migrations/20250101000002_rls_policies.sql` and run it.

### Migration 3: Functions & Triggers
Copy the contents of `supabase/migrations/20250101000003_functions_triggers.sql` and run it.

### Migration 4: Seed Data
Copy the contents of `supabase/migrations/20250101000004_seed_data.sql` and run it.

## Step 5: Test Connection

After updating your `.env.local`, restart your dev server:

```bash
# Kill current server
Ctrl+C

# Restart with new environment
npm run dev
```

## Step 6: Start Scraping

Once connected, you can start scraping:

```bash
# Test a single source
curl -X POST http://localhost:3002/api/admin/scraping/sources/mgto/test

# Start all scraping
curl -X POST http://localhost:3002/api/admin/scraping/start

# Check status
curl http://localhost:3002/api/admin/scraping/status
```

## Verification

Your database should now have these tables:
- `profiles` - User profiles
- `events` - Event data
- `venues` - Venue information
- `event_sources` - Scraping sources
- `user_events` - Saved/liked events
- `ai_interactions` - AI matching data
- `subscriptions` - Pro memberships

🎉 **You're ready to scrape and store events!**