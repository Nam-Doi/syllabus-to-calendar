# Why `db-3c34ls-kr.vpc-pub-cdb.ntruss.com` Doesn't Work

## The Problem

The hostname `db-3c34ls-kr.vpc-pub-cdb.ntruss.com` fails with `ENOTFOUND` error on Vercel, even though it resolves locally.

## Root Cause

### 1. VPC Endpoint (Not Public)
- The `vpc-pub` in the hostname indicates it's a **VPC (Virtual Private Cloud) endpoint**
- VPC endpoints are designed for **internal network access** within NAVER Cloud Platform
- They are **not intended for external internet access**

### 2. DNS Resolution Issue
- **Locally**: Your machine can resolve it → `49.50.131.166` ✅
- **Vercel**: Their DNS servers (in different regions) **cannot resolve it** ❌
- This is because the DNS resolver for `vpc-pub-cdb.ntruss.com` is likely:
  - Private/internal DNS server
  - Only accessible within NAVER Cloud's network
  - Region-specific (works in Korea, not globally)

### 3. Network Architecture
```
Your Local Machine (Korea/Asia)
  ↓ Can resolve DNS
  ↓ Connects to 49.50.131.166
  ✅ Works

Vercel Servers (US/Global)
  ↓ Cannot resolve DNS
  ↓ ENOTFOUND error
  ❌ Fails
```

## Why IP Address Works

Using `49.50.131.166` directly:
- ✅ Bypasses DNS resolution
- ✅ Connects directly to the IP
- ✅ Works from anywhere

**But**: IP addresses can change, so this is temporary.

## Proper Solution

### Request Public Domain in NAVER Cloud Console

1. **Go to**: NAVER Cloud Console → Cloud DB for MySQL
2. **Select**: Your database instance
3. **Click**: "Manage Public Domain" or "Request Public Domain"
4. **Confirm**: Request the public domain
5. **Get**: New hostname like `db-xxxxx.cdb.ncloud.com` (NOT `vpc-pub`)

### Public Domain Benefits
- ✅ Globally resolvable DNS
- ✅ Works from any network (Vercel, AWS, etc.)
- ✅ Stable (doesn't change like IPs)
- ✅ Proper production solution

## Current Workaround

Using IP address `49.50.131.166`:
- ✅ Works immediately
- ⚠️ Temporary solution
- ⚠️ IP might change
- ⚠️ Not ideal for production

## Next Steps

1. **Immediate**: Use IP address `49.50.131.166` (already done)
2. **Proper Fix**: Request public domain in NAVER Cloud Console
3. **Update**: Change `DB_HOST` to the new public domain
4. **Production**: Use public domain for stability

## Reference

- NAVER Cloud DB Documentation: https://guide.ncloud-docs.com/docs/en/clouddbformysql-troubleshoot
- The public domain is required for external access from services like Vercel

