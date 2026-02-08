#!/bin/bash

# Deployment Script for Jimpitan Digital System
# Usage: ./deploy.sh "Commit message"

echo "🚀 Starting deployment process..."

# Check if commit message is provided
if [ -z "$1" ]; then
    echo "❌ Error: Commit message required"
    echo "Usage: ./deploy.sh \"Your commit message\""
    exit 1
fi

# Run build process
echo "📦 Building application..."
node build.js

# Git operations
echo "🔧 Git operations..."
git add .
git commit -m "$1"
git push origin main

echo "✅ Deployment completed!"
echo "📊 Users will auto-update on next visit"
echo "🔄 Cache will be automatically cleared"
