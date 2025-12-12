# Where to Find Public Endpoint in NAVER Cloud Console

## Current View
You're on: **Database Manage** tab (for creating/deleting databases)

## Check These Locations (in order):

### 1. "Status" Tab ⭐ (Most Likely)
1. Click the **"Status"** tab
2. Look for:
   - **"Connection Information"**
   - **"Endpoint"** or **"Public Domain"**
   - **"External Access"** section
   - Network/connection details

### 2. "Manage DB config" Tab
1. Click **"Manage DB config"** tab
2. Look for:
   - Network settings
   - Endpoint configuration
   - Public access settings

### 3. Main Details Section (Above Tabs)
1. Look at the area **above the tabs** (where it shows `< hackathondb-001-8blq Details`)
2. There might be:
   - Connection information box
   - Endpoint details
   - A **"Manage Public Domain"** button

### 4. DB Server List View
1. Go back to **DB Server list** (click "DB Server" in left sidebar)
2. In the table, look for:
   - **"Public Domain"** column
   - **"Endpoint"** column
   - Action button to **"Request Public Domain"**

## What You're Looking For

### If Public Domain Exists:
- Format: `db-xxxxx.cdb.ncloud.com` (NOT `vpc-pub-cdb.ntruss.com`)
- Labeled as: "Public Domain", "Public Endpoint", or "External Endpoint"

### If Public Domain Doesn't Exist:
- Button: **"Request Public Domain"** or **"Enable Public Access"**
- Option: **"Manage Public Domain"** → **"Request"**

## Quick Test While Searching

While you're looking, you can use the IP address as a temporary fix:
- Update `DB_HOST` in Vercel to: `49.50.131.166`
- This will work immediately
- Then switch to public domain when you find it

## Next Step

**Try the "Status" tab first** - that's where connection information is usually displayed.

