#!/bin/bash

# Vercel Deployment Helper Script
# This script helps prepare and deploy the application to Vercel

set -e

echo "🚀 Vercel Deployment Helper"
echo "============================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Vercel CLI not found. Installing..."
    npm install -g vercel
    echo "✅ Vercel CLI installed"
    echo ""
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please log in to Vercel:"
    vercel login
    echo ""
fi

echo "📋 Pre-deployment checklist:"
echo "  [ ] Code is committed and pushed to GitHub"
echo "  [ ] Environment variables are ready"
echo "  [ ] Database is accessible from Vercel"
echo "  [ ] NAVER Cloud DB ACL is configured"
echo ""

read -p "Have you completed the checklist above? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⚠️  Please complete the checklist first. See DEPLOY_NOW.md for details."
    exit 1
fi

echo ""
echo "🌐 Deploying Frontend..."
echo ""

cd FE

# Deploy to production
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Add environment variables in Vercel dashboard"
echo "  2. Configure backend API URL if deploying separately"
echo "  3. Test the deployed application"
echo ""

