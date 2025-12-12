# Vercel Deployment Guide

## Prerequisites

Before deploying, ensure you have:
- [ ] GitHub account
- [ ] Vercel account (sign up at vercel.com)
- [ ] Cloud MySQL database set up
- [ ] All API keys ready (Clova OCR, Clova Studio)

## Step 1: Set Up Cloud Database

### Option A: PlanetScale (Recommended - Free Tier)

1. Go to [planetscale.com](https://planetscale.com) and sign up
2. Create a new database named `syllabus_calendar`
3. Get connection string from dashboard
4. Import your local database:
   ```bash
   # Export local database
   mysqldump -u root -p syllabus_calendar > backup.sql
   
   # Import to PlanetScale (use their CLI or web interface)
   pscale shell syllabus_calendar main < backup.sql
   ```

### Option B: Railway

1. Go to [railway.app](https://railway.app) and sign up
2. Create new MySQL database
3. Get connection details from dashboard
4. Import using provided connection string

## Step 2: Prepare Environment Variables

1. Copy the example file:
   ```bash
   cp FE/.env.production.example FE/.env.production
   ```

2. Fill in your actual values in `.env.production`:
   - Database credentials from Step 1
   - Generate JWT secret: `openssl rand -base64 32`
   - Add your Clova API keys

## Step 3: Push to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Prepare for Vercel deployment"

# Create GitHub repository and push
git remote add origin https://github.com/YOUR_USERNAME/syllabus-to-calendar.git
git branch -M main
git push -u origin main
```

## Step 4: Deploy to Vercel

### Via Vercel Dashboard (Easiest)

1. Go to [vercel.com](https://vercel.com) and log in
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `FE`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

5. Add Environment Variables:
   - Click "Environment Variables"
   - Add each variable from your `.env.production` file
   - Make sure to add them for Production, Preview, and Development

6. Click "Deploy"

### Via Vercel CLI (Alternative)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd FE
vercel --prod
```

## Step 5: Configure Backend (Option 2 - Separate Deployment)

If deploying backend separately:

1. Create new Vercel project for backend
2. Configure:
   - **Root Directory**: `BE`
   - **Build Command**: `npm install`
   - **Output Directory**: `.`
3. Add backend environment variables
4. Deploy
5. Update frontend `BACKEND_API_URL` with backend URL

## Step 6: File Storage Setup

Since Vercel's filesystem is read-only, configure file storage:

### Option A: Vercel Blob (Recommended)

```bash
# Install Vercel Blob
cd FE
npm install @vercel/blob
```

Update upload logic to use Vercel Blob instead of local filesystem.

### Option B: AWS S3

1. Create S3 bucket
2. Get access keys
3. Add to environment variables
4. Update upload logic

## Step 7: Verify Deployment

1. Visit your Vercel URL
2. Test user registration
3. Test login
4. Try uploading a syllabus
5. Verify course creation
6. Check calendar functionality

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Database Connection Fails

- Verify connection string format
- Check if database allows connections from Vercel IPs
- Ensure SSL is configured if required

### File Upload Fails

- Remember: Vercel filesystem is read-only
- Must use Vercel Blob, S3, or similar service
- Check upload endpoint logs

## Post-Deployment

1. Set up custom domain (optional)
2. Configure HTTPS (automatic with Vercel)
3. Set up monitoring
4. Configure analytics
5. Set up error tracking (Sentry, etc.)

## Environment Variables Reference

Required variables:
- `DB_HOST` - Database host
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name (syllabus_calendar)
- `DB_PORT` - Database port (usually 3306)
- `JWT_SECRET` - Secret for JWT tokens
- `BACKEND_API_URL` - Backend URL (if separate)

Optional variables:
- `CLOVA_STUDIO_API_KEY` - For AI features
- `CLOVA_STUDIO_URL` - For AI features
- `SECRET_KEY_OCR` - For OCR features
- `CLOVA_OCR_URL` - For OCR features

## Useful Commands

```bash
# View deployment logs
vercel logs

# List deployments
vercel ls

# Remove deployment
vercel rm [deployment-url]

# Check environment variables
vercel env ls
```

## Support

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- PlanetScale Docs: https://planetscale.com/docs
