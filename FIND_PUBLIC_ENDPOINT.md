# How to Find Public Endpoint in NAVER Cloud Console

## Current Location
You're viewing: **Process list** tab for database `hackathondb-001-8blq`

## Where to Find Public Domain/Endpoint

### Option 1: Check the Main Details Page (Above Tabs)
1. Look at the **top section** above the tabs
2. There might be a **"Connection Information"** or **"Endpoint"** section
3. Look for:
   - **Public Domain** or **Public Endpoint**
   - **External Access** settings
   - A button like **"Manage Public Domain"** or **"Request Public Domain"**

### Option 2: Check "Database Manage" Tab
1. Click on the **"Database Manage"** tab
2. Look for connection information or endpoint settings there

### Option 3: Check Instance List View
1. Go back to the **DB Server list** (click "DB Server" in left sidebar)
2. In the list view, there might be a column showing **"Public Domain"** or **"Endpoint"**
3. Or there might be an action button to **"Request Public Domain"**

### Option 4: Look for Network/ACL Settings
1. The public domain might be in **ACL (Access Control List)** settings
2. Or in a separate **"Network"** or **"Connection"** section

## What to Look For

### If Public Domain Already Exists:
- Format: `db-xxxxx.cdb.ncloud.com` (NOT `vpc-pub-cdb.ntruss.com`)
- Should be listed as "Public Domain" or "Public Endpoint"

### If Public Domain Doesn't Exist:
- Look for button: **"Request Public Domain"** or **"Enable Public Access"**
- Or **"Manage Public Domain"** → **"Request"**

## Current Status

From your screenshot:
- ✅ Database: `hackathondb`
- ✅ User: `dbadmin`
- ❌ Public Domain: Not visible (need to find/request it)
- ⚠️ Current hostname: `db-3c34ls-kr.vpc-pub-cdb.ntruss.com` (VPC endpoint, not public)

## Quick Actions

1. **Check the main page** (above tabs) for connection info
2. **Click "Database Manage"** tab - might have endpoint info
3. **Go back to DB Server list** - check for public domain column
4. **Look for "Request Public Domain"** button anywhere on the page

## Alternative: Use IP Address (Temporary)

If you can't find the public domain option:
- Use IP: `49.50.131.166` (works but temporary)
- Update `DB_HOST` in Vercel to this IP
- Then find public domain later for production

