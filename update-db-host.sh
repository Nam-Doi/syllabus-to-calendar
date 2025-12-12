#!/bin/bash

# Script to update DB_HOST to use IP address instead of hostname
# This fixes the ENOTFOUND error

echo "Updating DB_HOST environment variable to use IP address..."
echo ""

# Remove old hostname from all environments
echo "Removing old DB_HOST..."
vercel env rm DB_HOST <<EOF
a
y
EOF

echo ""
echo "Adding new DB_HOST with IP address..."
echo "49.50.131.166" | vercel env add DB_HOST production
echo "49.50.131.166" | vercel env add DB_HOST preview
echo "49.50.131.166" | vercel env add DB_HOST development

echo ""
echo "✅ DB_HOST updated to: 49.50.131.166"
echo ""
echo "Next: Redeploy the application"
echo "Run: vercel --prod"

