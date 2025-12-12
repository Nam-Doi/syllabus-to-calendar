#!/bin/bash

# Script to add environment variables to Vercel project
# Usage: ./add-env-vars.sh

echo "🔐 Adding environment variables to Vercel project"
echo "=================================================="
echo ""

PROJECT_NAME="syllabus-to-calendar"

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: Please run this script from the project root"
    exit 1
fi

echo "📝 You'll be prompted to enter each environment variable value."
echo "   Press Enter to skip optional variables."
echo ""

# Required variables
echo "=== Required Variables ==="
vercel env add DB_HOST production
vercel env add DB_USER production
vercel env add DB_PASSWORD production
vercel env add DB_NAME production
vercel env add DB_PORT production
vercel env add NEXTAUTH_SECRET production

echo ""
echo "=== Optional Variables ==="
echo "Backend API URL (if deploying backend separately):"
vercel env add BACKEND_API_URL production

echo ""
echo "✅ Environment variables added!"
echo ""
echo "📋 Next steps:"
echo "   1. Go to https://vercel.com/van-trans-projects-5c55ea5c/syllabus-to-calendar/settings"
echo "   2. Set 'Root Directory' to: FE"
echo "   3. Save settings"
echo "   4. Redeploy the project"
echo ""

