# Fix: ENOTFOUND Database Hostname Error

## Problem

The error `ENOTFOUND db-3c34ls-kr.vpc-pub-cdb.ntruss.com` means DNS cannot resolve the hostname. This is because:

1. **VPC Endpoint**: The hostname contains `vpc-pub` which indicates it's a VPC endpoint
2. **Not Publicly Accessible**: VPC endpoints are typically only accessible from within the same VPC network
3. **Wrong Hostname**: For external access, you need the **public endpoint**

## Solution

### Step 1: Find the Public Endpoint

In NAVER Cloud Console:

1. Go to **Cloud DB for MySQL**
2. Select your database instance
3. Look for **"Public Endpoint"** or **"External Access Endpoint"**
4. The format should be: `db-xxxxx.cdb.ncloud.com` (NOT `vpc-pub-cdb.ntruss.com`)

### Step 2: Update Environment Variable

Once you have the correct public endpoint, update it in Vercel:

```bash
# Remove the old hostname
vercel env rm DB_HOST production

# Add the correct public endpoint
echo 'db-xxxxx.cdb.ncloud.com' | vercel env add DB_HOST production
```

Or update it in the Vercel Dashboard:
- Go to: https://vercel.com/van-trans-projects-5c55ea5c/syllabus-to-calendar/settings/environment-variables
- Edit `DB_HOST` with the correct public endpoint
- Save

### Step 3: Verify

After updating, the hostname should:
- ✅ Be publicly resolvable (not a VPC endpoint)
- ✅ Format: `db-xxxxx.cdb.ncloud.com`
- ✅ Be accessible from the internet

## Alternative: Enable Public Access

If there's no public endpoint available:

1. In NAVER Cloud Console → Cloud DB for MySQL
2. Check if there's an option to **"Enable Public Access"** or **"Create Public Endpoint"**
3. Some NAVER Cloud DB instances need to be configured for external access

## Current Configuration

**Current (Wrong):**
```
DB_HOST=db-3c34ls-kr.vpc-pub-cdb.ntruss.com  ❌ VPC endpoint, not publicly accessible
```

**Should Be:**
```
DB_HOST=db-xxxxx.cdb.ncloud.com  ✅ Public endpoint
```

## Next Steps

1. Check NAVER Cloud Console for the public endpoint
2. Update `DB_HOST` in Vercel environment variables
3. Redeploy or wait for automatic redeploy
4. Test the connection again

