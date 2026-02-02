# Quick Deployment Commands Reference

## Check Deployment Status (from Windows PowerShell)

### Prerequisites
```powershell
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Navigate to project
cd "\\wsl.localhost\Ubuntu\home\redbear4013\Projects\Engaged App-ccpm"
```

### Link to Existing Vercel Project
```powershell
vercel link --project-id prj_aH3hzCL8n5HgahtGNpKTpiURS49C
```

### Check Current Deployment Status
```powershell
vercel ls
```

### View Latest Deployment
```powershell
vercel inspect
```

### Deploy to Production
```powershell
vercel --prod
```

### View Deployment Logs
```powershell
vercel logs <deployment-url>
```

## Alternative: Use GitHub CLI (from WSL)

### Check if Auto-Deploy Triggered
```bash
gh api repos/:owner/:repo/actions/runs --jq '.workflow_runs[0] | {status, conclusion, created_at, html_url}'
```

## Vercel Dashboard URLs

- **Dashboard**: https://vercel.com/dashboard
- **Project Settings**: https://vercel.com/your-username/engaged-app/settings
- **Deployments**: https://vercel.com/your-username/engaged-app/deployments
- **Environment Variables**: https://vercel.com/your-username/engaged-app/settings/environment-variables

## Environment Variables to Set

Copy these to Vercel Dashboard → Settings → Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://emwdopcuoulfgdojxasi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key-from-supabase>
SUPABASE_SERVICE_ROLE_KEY=<your-service-key-from-supabase>
NEXT_PUBLIC_USE_MOCK_SUPABASE=false
```

**To get your Supabase keys**:
1. Go to: https://supabase.com/dashboard/project/emwdopcuoulfgdojxasi
2. Click: Settings → API
3. Copy:
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

## Testing Deployment

### 1. Test Homepage
```bash
curl https://your-app.vercel.app
```

### 2. Test API Health
```bash
curl https://your-app.vercel.app/api/health
```

### 3. Test Calendar Page
Open in browser:
- https://your-app.vercel.app/test-calendar

### 4. Test Admin Pages
Open in browser:
- https://your-app.vercel.app/admin/setup-sources
- https://your-app.vercel.app/admin/run-scraper

## Troubleshooting

### Build Errors
```powershell
# View build logs
vercel logs <deployment-url> --follow

# Check for TypeScript errors locally
npm run build

# Check for linting errors
npm run lint
```

### Environment Variable Issues
```powershell
# List current environment variables
vercel env ls

# Pull environment variables to local
vercel env pull
```

### Redeploy After Changes
```powershell
# Redeploy latest commit
vercel --prod --force
```

## Post-Deployment Verification Checklist

- [ ] Homepage loads without errors
- [ ] `/test-calendar` displays calendar UI
- [ ] `/admin/setup-sources` loads admin interface
- [ ] `/admin/run-scraper` loads scraper interface
- [ ] No console errors in browser DevTools
- [ ] API routes respond correctly
- [ ] Environment variables are set correctly
- [ ] Supabase connection working (mock mode disabled)
