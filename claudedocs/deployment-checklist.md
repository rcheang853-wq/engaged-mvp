# Deployment Checklist - Engaged App

## Current Status: ✅ Ready for Deployment

### Pre-Deployment (Completed)
- ✅ All code committed and pushed to GitHub (5 commits on main branch)
- ✅ Calendar interface working with mock Supabase
- ✅ Admin pages created (`/admin/setup-sources`, `/admin/run-scraper`)
- ✅ Scraping service implemented
- ✅ Vercel configuration present (`vercel.json`)
- ✅ `.playwright-mcp/` added to `.gitignore`

## Deployment Steps

### Step 1: Verify Vercel Project Connection
1. Go to https://vercel.com/dashboard
2. Find project: **Engaged App** (ID: `prj_aH3hzCL8n5HgahtGNpKTpiURS49C`)
3. Check if GitHub repository is connected:
   - Settings → Git → Repository
   - Should show: `your-username/Engaged-App-ccpm` (or similar)

### Step 2: Configure Environment Variables
**Critical**: Set these in Vercel Dashboard → Settings → Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://emwdopcuoulfgdojxasi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXT_PUBLIC_USE_MOCK_SUPABASE=false
```

**Important**: Set these for **Production**, **Preview**, and **Development** environments.

### Step 3: Trigger Deployment
**Option A: Auto-Deploy (Recommended)**
- If GitHub is connected, the push to main should have automatically triggered deployment
- Check: Vercel Dashboard → Deployments → Look for latest deployment
- Status should show: Building → Ready

**Option B: Manual Deploy from Windows**
```powershell
cd "\\wsl.localhost\Ubuntu\home\redbear4013\Projects\Engaged App-ccpm"
npx vercel link --project-id prj_aH3hzCL8n5HgahtGNpKTpiURS49C
npx vercel --prod
```

### Step 4: Verify Deployment
1. Wait for deployment to complete (typically 2-5 minutes)
2. Get deployment URL from Vercel dashboard
3. Visit: `https://your-app.vercel.app`
4. Check pages:
   - ✅ Homepage loads
   - ✅ `/test-calendar` shows calendar
   - ✅ `/admin/setup-sources` loads admin page
   - ✅ `/admin/run-scraper` loads scraper page

## Post-Deployment: Set Up Event Sources

### Step 5: Create Event Sources in Supabase
Go to Supabase Dashboard → SQL Editor → New Query

Run the SQL from: `claudedocs/event-sources-sql.sql`

### Step 6: Run Initial Scrape
1. Navigate to: `https://your-app.vercel.app/admin/run-scraper`
2. Click "Run Scraper"
3. Wait for results (may take 30-60 seconds)
4. Should see: "Successfully scraped X events"

### Step 7: Verify Events on Calendar
1. Navigate to: `https://your-app.vercel.app/test-calendar`
2. Calendar should display scraped events
3. Check all views: Month, Week, Day

## Troubleshooting

### Build Fails
- Check Vercel logs: Dashboard → Deployments → Click deployment → View logs
- Common issues:
  - Missing environment variables
  - TypeScript errors
  - Missing dependencies

### No Events Showing
- Verify event sources created: Supabase Dashboard → Table Editor → event_sources
- Check scraping ran successfully: event_sources table → last_scraped_at should be recent
- Check events table: Should have entries

### Scraper Fails
- Check error in `/admin/run-scraper` page
- Common issues:
  - Target website changed structure
  - Selectors need updating
  - Network timeout (increase in vercel.json if needed)

## Next Steps After Successful Deployment
1. ✅ Verify calendar displays events correctly
2. ⏳ Set up automated scraping (cron job or scheduled function)
3. ⏳ Configure event source refresh schedule
4. ⏳ Test event filtering and search
5. ⏳ Set up monitoring and alerts
