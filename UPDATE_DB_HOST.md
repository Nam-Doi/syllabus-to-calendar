# Update DB_HOST to Fix ENOTFOUND Error

## Problem
Vercel cannot resolve the hostname `db-3c34ls-kr.vpc-pub-cdb.ntruss.com`. We need to use the IP address instead.

## Solution: Update DB_HOST Environment Variable

### Option 1: Via Vercel Dashboard (Easiest) ⭐

1. **Go to Environment Variables:**
   https://vercel.com/van-trans-projects-5c55ea5c/syllabus-to-calendar/settings/environment-variables

2. **Find `DB_HOST`** and click to edit

3. **Update the value:**
   - **Old:** `db-3c34ls-kr.vpc-pub-cdb.ntruss.com`
   - **New:** `49.50.131.166`

4. **Update for all environments:**
   - Production ✅
   - Preview ✅
   - Development ✅

5. **Save** and wait for auto-redeploy, or manually redeploy

### Option 2: Via CLI

Run this script:
```bash
./update-db-host.sh
```

Or manually:
```bash
# Remove old (will prompt for environments - select all)
vercel env rm DB_HOST

# Add new IP address
echo '49.50.131.166' | vercel env add DB_HOST production
echo '49.50.131.166' | vercel env add DB_HOST preview
echo '49.50.131.166' | vercel env add DB_HOST development

# Redeploy
vercel --prod
```

## Verify Update

After updating, verify:
```bash
vercel env pull .env.vercel
cat .env.vercel | grep DB_HOST
```

Should show: `DB_HOST="49.50.131.166"`

## After Update

1. The application will automatically redeploy
2. Or manually trigger: `vercel --prod`
3. Test registration/login again

## Important Note

⚠️ **Using IP address is temporary**. For production, find the public endpoint in NAVER Cloud Console:
- Format: `db-xxxxx.cdb.ncloud.com`
- Update `DB_HOST` to use that endpoint instead

