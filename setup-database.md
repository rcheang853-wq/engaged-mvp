# 🗄️ Quick Database Setup

## Option 1: Automatic Setup (Recommended)

I'll create a setup script that applies all migrations automatically. Run this in your project:

```bash
# This will apply all 4 migrations to your Supabase database
npm run db:setup
```

## Option 2: Manual Setup

If you prefer to run migrations manually:

### Step 1: Go to SQL Editor
1. Open: https://emwdopcuoulfgdojxasi.supabase.co
2. Click **SQL Editor** (left sidebar)
3. Click **New query**

### Step 2: Run Migrations in Order

Copy each file content and run them one by one:

1. **Migration 1**: `supabase/migrations/20250101000001_initial_schema.sql`
2. **Migration 2**: `supabase/migrations/20250101000002_rls_policies.sql`
3. **Migration 3**: `supabase/migrations/20250101000003_functions_triggers.sql`
4. **Migration 4**: `supabase/migrations/20250101000004_seed_data.sql`

### Step 3: Verify Setup

After running all migrations, you should see these tables:
- profiles, events, venues, organizers
- event_categories, user_swipes, user_events
- subscriptions, payments, user_usage
- event_sources, scrape_jobs
- event_analytics, user_analytics

## 🚀 What's Next?

After database setup:
1. Restart dev server: `npm run dev`
2. Test scraping: `curl -X POST http://localhost:3002/api/admin/scraping/sources/mgto/test`
3. Check status: `curl http://localhost:3002/api/admin/scraping/status`

The database will be ready to store scraped events from all 6 Macau sources!