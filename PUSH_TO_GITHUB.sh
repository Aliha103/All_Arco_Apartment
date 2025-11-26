#!/bin/bash
# Script to push All'Arco Apartment code to GitHub

echo "🚀 Pushing All'Arco Apartment to GitHub..."
echo ""

# Your GitHub token
TOKEN="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"
REPO="github.com/Aliha103/All_Arco_Apartment.git"

echo "📍 Current directory: $(pwd)"
echo "📋 Current branch: $(git branch --show-current)"
echo ""

# Show what will be pushed
echo "📊 Changes to push:"
git log main..HEAD --oneline
echo ""

# Push to main
echo "⬆️  Pushing to GitHub main branch..."
git push "https://${TOKEN}@${REPO}" HEAD:main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 View at: https://github.com/Aliha103/All_Arco_Apartment"
else
    echo ""
    echo "❌ Push failed. Error code: $?"
fi
