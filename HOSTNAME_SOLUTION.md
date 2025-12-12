# Solution for Database Hostname Issue

## Current Situation

The hostname `db-3c34ls-kr.vpc-pub-cdb.ntruss.com` resolves locally but fails on Vercel with `ENOTFOUND` error.

## Possible Solutions

### Option 1: Use IP Address Directly (Quick Fix)

**⚠️ Warning**: IP addresses can change, so this is a temporary solution.

1. Get the IP address: `49.50.131.166` (from nslookup)
2. Update Vercel environment variable:
   ```bash
   vercel env rm DB_HOST production
   echo '49.50.131.166' | vercel env add DB_HOST production
   ```

**Note**: This works but is not recommended for production as IPs can change.

### Option 2: Find Public Endpoint in NAVER Cloud Console (Recommended)

1. Go to **NAVER Cloud Console** → **Cloud DB for MySQL**
2. Select your database instance
3. Look for:
   - **"Public Endpoint"** section
   - **"External Access"** settings
   - **"Connection Information"** → Check for public vs VPC endpoint
4. The public endpoint should be in format: `db-xxxxx.cdb.ncloud.com`
5. If you see both VPC and Public endpoints, use the Public one

### Option 3: Enable Public Access

If only VPC endpoint is available:

1. In NAVER Cloud Console → Cloud DB for MySQL
2. Go to your database instance settings
3. Look for **"Public Access"** or **"External Access"** option
4. Enable it if available
5. This may create a new public endpoint

### Option 4: Check DNS from Vercel's Region

The issue might be that Vercel's DNS servers (in different regions) can't resolve this domain. 

Try:
1. Check if there's a region-specific endpoint
2. Contact NAVER Cloud support to verify the correct public endpoint
3. Ask if the VPC endpoint should be accessible externally

## Recommended Action

**Best approach**: Use Option 2 - Find the public endpoint in NAVER Cloud Console.

If that's not available, use Option 1 (IP address) as a temporary workaround, then find the proper public endpoint.

## Update Environment Variable

Once you have the correct endpoint:

```bash
# Remove old
vercel env rm DB_HOST production
vercel env rm DB_HOST preview  
vercel env rm DB_HOST development

# Add new (replace with actual endpoint)
echo 'db-xxxxx.cdb.ncloud.com' | vercel env add DB_HOST production
echo 'db-xxxxx.cdb.ncloud.com' | vercel env add DB_HOST preview
echo 'db-xxxxx.cdb.ncloud.com' | vercel env add DB_HOST development
```

Or update via Vercel Dashboard:
- Settings → Environment Variables
- Edit `DB_HOST` for all environments

