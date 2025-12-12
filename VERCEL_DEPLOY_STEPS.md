# Quick Vercel Deployment Steps

## Option 1: Deploy via Vercel Dashboard (Recommended for first time)

### Step 1: Push code to GitHub
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin master
```

### Step 2: Go to Vercel Dashboard
1. Visit [vercel.com/new](https://vercel.com/new)
2. Sign in with GitHub
3. Click "Import Project"
4. Select your repository: `NAVER-Hackathon/syllabus-to-calendar`

### Step 3: Configure Project
- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `FE`
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

### Step 4: Add Environment Variables
Click "Environment Variables" and add:

**Required:**
- `DB_HOST` - Your NAVER Cloud DB host
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name (usually `syllabus_calendar`)
- `DB_PORT` - Database port (usually `3306`)
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `BACKEND_API_URL` - Your backend URL (if deploying separately)

**Optional (for backend features):**
- `SECRET_KEY_OCR` - Clova OCR secret key
- `CLOVA_OCR_URL` - Clova OCR endpoint
- `CLOVA_STUDIO_API_KEY` - Clova Studio API key
- `CLOVA_STUDIO_URL` - Clova Studio endpoint

**Important:** Add these for all environments (Production, Preview, Development)

### Step 5: Deploy
Click "Deploy" and wait for the build to complete!

---

## Option 2: Deploy via Vercel CLI

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login
```bash
vercel login
```

### Step 3: Deploy
```bash
cd FE
vercel --prod
```

### Step 4: Add Environment Variables
```bash
vercel env add DB_HOST production
vercel env add DB_USER production
vercel env add DB_PASSWORD production
vercel env add DB_NAME production
vercel env add DB_PORT production
vercel env add NEXTAUTH_SECRET production
vercel env add BACKEND_API_URL production
```

---

## Important Notes

1. **Database ACL**: Make sure your NAVER Cloud DB allows connections from Vercel IPs (add `0.0.0.0/0` or specific Vercel IPs)

2. **Backend Deployment**: If you want to deploy the backend separately:
   - Create a new Vercel project
   - Set root directory to `BE`
   - Use the `BE/vercel.json` configuration
   - Update `BACKEND_API_URL` in frontend with the backend URL

3. **File Uploads**: Vercel's filesystem is read-only. If you need file uploads, consider:
   - Vercel Blob Storage
   - AWS S3
   - Cloudinary

4. **Generate JWT Secret**:
   ```bash
   openssl rand -base64 32
   ```

---

## Troubleshooting

**Build fails?**
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (requires >=18.0.0)

**Database connection fails?**
- Verify NAVER Cloud DB ACL settings
- Check environment variables are set correctly
- Ensure database is accessible from external IPs

**Environment variables not working?**
- Make sure they're added for the correct environment (Production/Preview/Development)
- Redeploy after adding new environment variables

