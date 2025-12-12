# Complete Vercel Deployment - Final Steps

## Current Status ✅
- ✅ Vercel CLI installed and logged in
- ✅ Project linked: `syllabus-to-calendar`
- ✅ Deployment configuration files committed

## Required: Set Root Directory in Dashboard

The CLI can't set the root directory, so we need to use the dashboard:

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/van-trans-projects-5c55ea5c/syllabus-to-calendar/settings

2. **Set Root Directory:**
   - Scroll to "Root Directory" section
   - Change from `./` to `FE`
   - Click "Save"

3. **Add Environment Variables:**
   - Go to: https://vercel.com/van-trans-projects-5c55ea5c/syllabus-to-calendar/settings/environment-variables
   - Add each variable (see below)

## Environment Variables to Add

Add these in the Vercel dashboard for **Production**, **Preview**, and **Development**:

### Required:
```
DB_HOST=your-naver-cloud-db-host
DB_USER=your-db-username  
DB_PASSWORD=your-db-password
DB_NAME=syllabus_calendar
DB_PORT=3306
NEXTAUTH_SECRET=RxP9zO+WcAOy2JQcDgKXGv9Ar2e/fgsv6iRaz2TYUsc=
```

### Optional (if deploying backend separately):
```
BACKEND_API_URL=https://your-backend-url.vercel.app
```

## Deploy After Configuration

Once you've set the root directory and added environment variables:

```bash
cd /Users/dylantran/Documents/dev/s2p/syllabus-to-calendar
vercel --prod
```

Or simply push to GitHub and Vercel will auto-deploy:
```bash
git push origin master
```

## Alternative: Add Env Vars via CLI

If you prefer CLI, run:
```bash
./add-env-vars.sh
```

Then follow the prompts to enter each value.

## Verify Deployment

After deployment, visit:
- Production: https://syllabus-to-calendar-van-trans-projects-5c55ea5c.vercel.app

## Troubleshooting

**Build fails with "No Next.js version detected"?**
- Make sure Root Directory is set to `FE` in dashboard
- Settings → General → Root Directory → `FE`

**Database connection fails?**
- Verify NAVER Cloud DB ACL allows connections from Vercel IPs
- Check environment variables are set correctly
- Ensure database is accessible from external IPs

