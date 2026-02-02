# 🚀 Deployment Quick Start Guide

## Current Status
✅ **Code is ready for deployment** - All commits pushed to GitHub

## Your Mission: Get the Calendar Working with Real Events

### 🎯 Goal
Complete the flow: **Scraping → Database → Calendar Display**

---

## 📋 Step-by-Step Instructions

### Step 1: Check Vercel Auto-Deploy (2 minutes)
Your project is likely already deployed automatically!

1. **Open Vercel Dashboard**: https://vercel.com/dashboard
2. **Find your project**: `prj_aH3hzCL8n5HgahtGNpKTpiURS49C`
3. **Click "Deployments" tab**
4. **Check latest deployment**:
   - ✅ **Status: Ready** → Proceed to Step 2
   - 🔄 **Status: Building** → Wait 2-3 minutes
   - ❌ **Status: Failed** → Check logs, may need environment variables

**Your deployment URL**: Will be shown in Vercel dashboard (something like `engaged-app-xyz.vercel.app`)

---

### Step 2: Configure Environment Variables (3 minutes)
**Critical for scraping and database access**

1. In Vercel dashboard, go to: **Settings → Environment Variables**
2. Add these 4 variables (click "Add" for each):

```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://emwdopcuoulfgdojxasi.supabase.co
Environments: ☑️ Production ☑️ Preview ☑️ Development
```

```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: [Get from Supabase Dashboard → Settings → API → anon public key]
Environments: ☑️ Production ☑️ Preview ☑️ Development
```

```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: [Get from Supabase Dashboard → Settings → API → service_role secret key]
Environments: ☑️ Production ☑️ Preview ☑️ Development
```

```
Name: NEXT_PUBLIC_USE_MOCK_SUPABASE
Value: false
Environments: ☑️ Production ☑️ Preview ☑️ Development
```

3. **Redeploy**: After adding variables, click "Redeploy" on latest deployment

---

### Step 3: Create Event Sources in Database (2 minutes)
**This tells the scraper where to find events**

1. **Open Supabase Dashboard**: https://supabase.com/dashboard/project/emwdopcuoulfgdojxasi
2. **Go to**: SQL Editor → New Query
3. **Copy and paste** the entire contents from: `claudedocs/event-sources-sql.sql`
4. **Click**: Run
5. **Verify**: Should see 3 rows inserted (Eventbrite, Meetup, Time Out)

---

### Step 4: Test with Quick Events (Optional - 1 minute)
**Want to see the calendar working immediately?**

1. In Supabase SQL Editor, run: `claudedocs/test-events-sql.sql`
2. This creates 14 test events over the next 7 days
3. Calendar will immediately show these events
4. You can delete them later after real scraping works

---

### Step 5: Run the Scraper (2 minutes)
**Get real events from the web**

1. **Open**: `https://your-app.vercel.app/admin/run-scraper`
2. **Click**: "Run Scraper" button
3. **Wait**: 30-60 seconds (browser will show progress)
4. **Result**: Should see "Successfully scraped X events"

**Troubleshooting**:
- **Timeout**: Increase `maxDuration` in `vercel.json` → redeploy
- **No events found**: Selectors may need updating (websites change)
- **Error**: Check browser console (F12) for details

---

### Step 6: View Events on Calendar (30 seconds)
**The moment of truth!**

1. **Open**: `https://your-app.vercel.app/test-calendar`
2. **Should see**:
   - Events displayed on calendar
   - Can switch between Month/Week/Day views
   - Click events to see details
   - Navigate between dates

**Success looks like**:
- 📅 Events showing in calendar grid
- 🎨 Different colored event blocks
- 🖱️ Clickable events with details
- 🔄 Smooth navigation between views

---

## 🎉 Success Criteria

You've completed the mission when:
- [ ] Vercel deployment shows "Ready"
- [ ] Environment variables configured
- [ ] Event sources created in database
- [ ] Scraper runs without errors
- [ ] Calendar displays events
- [ ] Can navigate calendar views
- [ ] Can click events for details

---

## 🆘 Troubleshooting

### "Cannot connect to Supabase"
→ Check environment variables are set correctly in Vercel

### "No events found" after scraping
→ Run test events SQL to verify calendar works first
→ Check event_sources table has active sources
→ Selectors may need updating

### Deployment fails
→ Check Vercel logs: Deployments → Click deployment → View logs
→ Common: Missing environment variables or TypeScript errors

### Calendar shows empty
→ Check Supabase: Table Editor → events table
→ Should have rows with start_time in future
→ Run test events SQL to quickly populate

---

## 📚 Additional Resources

- **Full Deployment Guide**: `claudedocs/deployment-checklist.md`
- **Command Reference**: `claudedocs/deployment-commands.md`
- **Event Sources SQL**: `claudedocs/event-sources-sql.sql`
- **Test Events SQL**: `claudedocs/test-events-sql.sql`

---

## ⏭️ What's Next?

After getting this working:
1. Set up automated scraping (cron job)
2. Add more event sources
3. Improve scraper selectors
4. Add event filtering and search
5. Set up monitoring and alerts

---

**Estimated Total Time**: 10-15 minutes
**Difficulty**: Easy - just follow the steps!

Good luck! 🚀
