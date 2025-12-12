# NAVER Cloud MySQL Setup for Vercel Deployment

## Quick Setup Guide

Since you already have NAVER Cloud DB for MySQL, you just need to get the connection details and configure them for Vercel.

## Step 1: Get NAVER Cloud DB Connection Details

From your NAVER Cloud Console:

1. Go to **Cloud DB for MySQL** service
2. Select your database instance
3. Note down:
   - **Host**: Usually in format `db-xxxxx.cdb.ncloud.com`
   - **Port**: Usually `3306`
   - **Database Name**: Your database name (e.g., `syllabus_calendar`)
   - **Username**: Your DB username
   - **Password**: Your DB password

## Step 2: Test Connection Locally

Before deploying, test the connection:

```bash
# Update FE/.env.local with NAVER Cloud credentials
DB_HOST=db-xxxxx.cdb.ncloud.com
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=syllabus_calendar
DB_PORT=3306
```

Test the connection:
```bash
cd FE
npm run db:test
```

You should see: `✅ Connection successful`

## Step 3: Configure Vercel Environment Variables

When deploying to Vercel, add these environment variables in the Vercel dashboard:

### Required Variables

```
DB_HOST=db-xxxxx.cdb.ncloud.com
DB_USER=your_naver_db_username
DB_PASSWORD=your_naver_db_password
DB_NAME=syllabus_calendar
DB_PORT=3306
JWT_SECRET=<generate with: openssl rand -base64 32>
BACKEND_API_URL=http://localhost:3001
```

### Optional (for AI features)

```
CLOVA_STUDIO_API_KEY=your_key
CLOVA_STUDIO_URL=your_url
SECRET_KEY_OCR=your_ocr_key
CLOVA_OCR_URL=your_ocr_url
```

## Step 4: Verify Database Access

### Check ACL (Access Control List)

NAVER Cloud DB has ACL settings. Make sure:

1. Go to **Cloud DB for MySQL** → **ACL Settings**
2. Add Vercel's IP ranges or allow all IPs:
   - `0.0.0.0/0` (for testing, not recommended for production)
   - Or add specific Vercel IP ranges

### Enable SSL (Recommended)

If your NAVER Cloud DB requires SSL:

1. Download the SSL certificate from NAVER Cloud
2. You may need to configure SSL in your database connection
3. Update connection string if needed

## Step 5: Migrate Database Schema

If you haven't already set up the schema on NAVER Cloud:

```bash
# Export from local
mysqldump -u root -p syllabus_calendar > backup.sql

# Import to NAVER Cloud
mysql -h db-xxxxx.cdb.ncloud.com -u your_username -p syllabus_calendar < backup.sql
```

Or use the init script:
```bash
# Update FE/.env.local with NAVER Cloud credentials first
cd FE
npm run db:init
```

## Step 6: Deploy to Vercel

Now you're ready to deploy:

1. Push code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Configure:
   - Root Directory: `FE`
   - Framework: Next.js
5. Add all environment variables from Step 3
6. Deploy!

## Troubleshooting

### Connection Timeout

If you get connection timeouts:
- Check NAVER Cloud DB ACL settings
- Verify the host and port are correct
- Ensure the database instance is running

### SSL Required Error

If you see SSL errors:
- Enable SSL in NAVER Cloud DB settings
- Download SSL certificate
- May need to add `ssl: { rejectUnauthorized: false }` to connection config (for testing only)

### Access Denied

- Verify username and password
- Check user permissions in NAVER Cloud DB
- Ensure user has access from external IPs

## Production Checklist

- [ ] NAVER Cloud DB ACL configured for Vercel IPs
- [ ] Database schema migrated
- [ ] Connection tested locally
- [ ] Environment variables set in Vercel
- [ ] SSL configured (if required)
- [ ] Backup strategy in place

## Connection String Format

For reference, your connection will look like:

```javascript
{
  host: 'db-xxxxx.cdb.ncloud.com',
  user: 'your_username',
  password: 'your_password',
  database: 'syllabus_calendar',
  port: 3306,
  // Optional SSL config
  ssl: {
    rejectUnauthorized: false
  }
}
```

## Next Steps

After database is configured:
1. ✅ Database setup complete
2. Continue with Vercel deployment
3. Test the deployed application
4. Monitor database performance

## Support

- NAVER Cloud DB Docs: https://guide.ncloud-docs.com/docs/database-database-10-1
- Vercel Environment Variables: https://vercel.com/docs/environment-variables
