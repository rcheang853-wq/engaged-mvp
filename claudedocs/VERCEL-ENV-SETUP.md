# Vercel Environment Variables Setup

## Quick Upload Method

### Step 1: Get Your Supabase Keys

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/emwdopcuoulfgdojxasi
2. **Navigate to**: Settings → API
3. **Copy these two keys**:
   - **"anon" "public"** → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **"service_role" "secret"** → This is your `SUPABASE_SERVICE_ROLE_KEY`

### Step 2: Update .env.vercel File

Open `.env.vercel` in your project and replace the placeholders:

```env
NEXT_PUBLIC_SUPABASE_URL=https://emwdopcuoulfgdojxasi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  ← Paste anon key here
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  ← Paste service key here
NEXT_PUBLIC_USE_MOCK_SUPABASE=false
```

### Step 3: Upload to Vercel

**Option A: Via Vercel Dashboard (Easiest)**
1. Go to: https://vercel.com/dashboard
2. Select your project: **Engaged App** (`prj_aH3hzCL8n5HgahtGNpKTpiURS49C`)
3. Click: **Settings** → **Environment Variables**
4. Click: **Import .env** button (top right)
5. Upload: `.env.vercel` file
6. Select environments: ☑️ Production ☑️ Preview ☑️ Development
7. Click: **Import**

**Option B: Via CLI (from Windows PowerShell)**
```powershell
cd "\\wsl.localhost\Ubuntu\home\redbear4013\Projects\Engaged App-ccpm"
vercel env pull
vercel env add < .env.vercel
```

### Step 4: Redeploy

After adding environment variables:
1. Go to: Deployments tab
2. Click: **•••** (three dots) on latest deployment
3. Click: **Redeploy**
4. Wait: ~3-5 minutes for build + deployment

---

## Verify Environment Variables

After uploading, verify they're set correctly:

1. **In Vercel Dashboard**:
   - Settings → Environment Variables
   - Should see 4 variables listed
   - Each should apply to Production, Preview, Development

2. **Test Deployment**:
   - Visit: `https://your-app.vercel.app/test-calendar`
   - Should load without errors
   - Check browser console (F12) - no Supabase errors

---

## Troubleshooting

### "Invalid API key" error
→ Double-check you copied the correct keys from Supabase
→ Make sure no extra spaces or newlines in the values

### "Project not found" error
→ Verify Supabase URL is correct
→ Check NEXT_PUBLIC_SUPABASE_URL matches your project

### Build succeeds but app shows errors
→ Verify NEXT_PUBLIC_USE_MOCK_SUPABASE is set to "false"
→ Redeploy after adding environment variables

---

## Security Notes

- ⚠️ **Never commit `.env.vercel` to git** (it's in `.gitignore`)
- ✅ Service role key should only be in Production/Preview
- ✅ Anon key is safe to expose (it's public anyway)
- 🔒 Keep service role key private - has admin access to database

---

## Next Steps After Setup

1. ✅ Environment variables configured
2. ⏭️ Create event sources: Run `claudedocs/event-sources-sql.sql`
3. ⏭️ Test scraping: Visit `/admin/run-scraper`
4. ⏭️ Verify calendar: Visit `/test-calendar`

Complete guide: `claudedocs/DEPLOYMENT-QUICKSTART.md`
