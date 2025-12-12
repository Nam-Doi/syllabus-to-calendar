# Quick Deployment with NAVER Cloud DB

## You're Almost Ready! 🚀

Since you already have NAVER Cloud DB for MySQL, you're 80% done. Here's what's left:

## ✅ Already Complete
- [x] Vercel configuration files created
- [x] Build verified successfully
- [x] Database exists (NAVER Cloud)
- [x] Deployment guides ready

## 📋 Final Steps (5 minutes)

### 1. Get NAVER Cloud DB Details

From your NAVER Cloud Console, note:
- Host: `db-xxxxx.cdb.ncloud.com`
- Port: `3306`
- Username: `your_username`
- Password: `your_password`
- Database: `syllabus_calendar`

### 2. Configure ACL (Important!)

In NAVER Cloud Console:
1. Go to **Cloud DB for MySQL** → **ACL Settings**
2. Add `0.0.0.0/0` (or Vercel's specific IPs)
3. This allows Vercel to connect to your database

### 3. Set Environment Variables

Copy and fill:
```bash
cp FE/.env.production.example FE/.env.production
```

Fill in your NAVER Cloud DB details:
```env
DB_HOST=db-xxxxx.cdb.ncloud.com
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=syllabus_calendar
DB_PORT=3306
JWT_SECRET=<run: openssl rand -base64 32>
BACKEND_API_URL=http://localhost:3001
```

### 4. Push to GitHub

```bash
git add .
git commit -m "Add Vercel deployment configuration"
git push origin main
```

### 5. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure:
   - **Root Directory**: `FE`
   - **Framework**: Next.js
4. Add environment variables (copy from `.env.production`)
5. Click **Deploy**!

## 📚 Detailed Guides

- **NAVER Cloud Setup**: [docs/NAVER_CLOUD_DB_SETUP.md](file:///Users/dylantran/Documents/dev/s2p/syllabus-to-calendar/docs/NAVER_CLOUD_DB_SETUP.md)
- **Full Deployment**: [docs/DEPLOYMENT.md](file:///Users/dylantran/Documents/dev/s2p/syllabus-to-calendar/docs/DEPLOYMENT.md)
- **Quick Checklist**: [DEPLOY_CHECKLIST.md](file:///Users/dylantran/Documents/dev/s2p/syllabus-to-calendar/DEPLOY_CHECKLIST.md)

## ⚠️ Don't Forget

- Configure NAVER Cloud DB ACL for external access
- Generate a strong JWT secret
- Add all environment variables in Vercel dashboard
- Test database connection before deploying

That's it! Your app will be live in ~5 minutes after deployment starts.
