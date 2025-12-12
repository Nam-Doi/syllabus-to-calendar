# Quick Start Deployment Checklist

## ✅ Pre-Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Cloud database set up (PlanetScale/Railway)
- [ ] Database migrated and tested
- [ ] Environment variables prepared
- [ ] Vercel account created

## 🚀 Deploy in 5 Minutes

### 1. Database Setup (Choose One)

**PlanetScale (Recommended)**
```bash
# Sign up at planetscale.com
# Create database: syllabus_calendar
# Get connection string
```

**Railway**
```bash
# Sign up at railway.app
# Add MySQL database
# Get connection details
```

### 2. Deploy Frontend

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Configure:
   - Root Directory: `FE`
   - Framework: Next.js
4. Add environment variables (see below)
5. Click Deploy!

### 3. Environment Variables

Add these in Vercel dashboard:

```
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=syllabus_calendar
DB_PORT=3306
JWT_SECRET=generate-with-openssl-rand-base64-32
BACKEND_API_URL=http://localhost:3001
```

### 4. Deploy Backend (Optional - if separate)

1. Create new Vercel project
2. Root Directory: `BE`
3. Add backend env variables
4. Deploy
5. Update frontend `BACKEND_API_URL`

## 📚 Full Documentation

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for complete guide.

## 🔧 Configuration Files

- `vercel.json` - Vercel configuration
- `FE/.env.production.example` - Environment template
- `BE/vercel.json` - Backend configuration (if separate)

## ⚠️ Important Notes

- **File Uploads**: Vercel filesystem is read-only. Use Vercel Blob or S3.
- **Database**: Must use cloud database, not local MySQL.
- **Environment Variables**: Set in Vercel dashboard, not in code.

## 🆘 Troubleshooting

**Build fails?**
- Check Node.js version in `package.json` engines
- Verify all dependencies are listed

**Database connection fails?**
- Check connection string format
- Verify database allows external connections

**Uploads don't work?**
- Implement Vercel Blob or S3 storage
- See deployment guide for details

## 📞 Support

- [Vercel Documentation](https://vercel.com/docs)
- [Full Deployment Guide](./docs/DEPLOYMENT.md)
