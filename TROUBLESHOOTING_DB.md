# Database Connection Troubleshooting

## Current Issue: 500 Error on Login API

The login API is returning a 500 error, which indicates a database connection failure.

## ✅ What We've Fixed

1. ✅ Added SSL configuration to database connection
2. ✅ Environment variables are set in Vercel
3. ✅ Deployment successful

## 🔍 Next Steps to Fix

### 1. Check NAVER Cloud DB ACL (Access Control List)

**This is the most likely issue!**

NAVER Cloud DB requires you to whitelist IP addresses that can connect.

1. Go to **NAVER Cloud Console** → **Cloud DB for MySQL**
2. Select your database instance
3. Go to **ACL Settings** (Access Control List)
4. Add Vercel's IP ranges or allow all IPs:
   - For testing: Add `0.0.0.0/0` (allows all IPs - not recommended for production)
   - For production: Add specific Vercel IP ranges

**Vercel IP Ranges:**
Vercel uses dynamic IPs, so you may need to:
- Allow all IPs temporarily to test (`0.0.0.0/0`)
- Or check Vercel's documentation for their IP ranges
- Or use a VPN/proxy solution

### 2. Test Database Connection

Test the connection via the API endpoint:

```bash
curl https://syllabus-to-calendar-epipvtc4c-van-trans-projects-5c55ea5c.vercel.app/api/db/test
```

This will show:
- ✅ Connection successful with database details
- ❌ Connection failed with error message

### 3. Check Vercel Logs

View real-time logs to see the actual error:

```bash
vercel logs https://syllabus-to-calendar-epipvtc4c-van-trans-projects-5c55ea5c.vercel.app
```

Or in Vercel Dashboard:
- Go to your project → Deployments → Click on the deployment → Logs

### 4. Verify Environment Variables

Double-check that all variables are set correctly:

```bash
vercel env ls
```

Make sure these are set for **Production**:
- DB_HOST
- DB_USER
- DB_PASSWORD
- DB_NAME
- DB_PORT
- NEXTAUTH_SECRET

### 5. Common Issues

#### Issue: "Access denied for user"
- **Solution**: Verify username and password in Vercel environment variables
- Check that the user has permissions to access the database

#### Issue: "Connection timeout"
- **Solution**: Check ACL settings - this is the most common issue
- Verify the host and port are correct
- Ensure the database instance is running

#### Issue: "SSL required"
- **Solution**: Already fixed in code (SSL is enabled)
- If still failing, check NAVER Cloud DB SSL settings

#### Issue: "Unknown database"
- **Solution**: Verify DB_NAME matches your actual database name
- You may need to create the database first

### 6. Test Locally First

Before troubleshooting on Vercel, test locally:

```bash
cd FE
# Update .env.local with NAVER Cloud DB credentials
npm run db:test
```

If local connection works but Vercel doesn't, it's definitely an ACL issue.

## Quick Fix Checklist

- [ ] Check NAVER Cloud DB ACL settings
- [ ] Add `0.0.0.0/0` to ACL (for testing)
- [ ] Verify environment variables in Vercel
- [ ] Test connection via `/api/db/test` endpoint
- [ ] Check Vercel logs for detailed error
- [ ] Verify database is running and accessible

## After Fixing ACL

Once ACL is configured:

1. Test the connection: `curl https://your-app.vercel.app/api/db/test`
2. Try logging in again
3. Check Vercel logs if still failing

## Need Help?

If the issue persists after checking ACL:
1. Check Vercel logs for the exact error message
2. Test database connection locally
3. Verify all credentials are correct
4. Contact NAVER Cloud support if ACL is configured but still failing

