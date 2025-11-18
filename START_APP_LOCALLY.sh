#!/bin/bash

# 🏃 START APP LOCALLY WITH EXPO GO

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║  📱  START FITNESSGURU LOCALLY                                 ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

cd /home/hubi/AttendanceApp

echo "🚀 Starting Expo development server..."
echo ""
echo "This will:"
echo "  ✓ Clear cache"
echo "  ✓ Start Metro bundler"
echo "  ✓ Show QR code to scan"
echo ""
echo "📱 On your phone:"
echo "  1. Install 'Expo Go' from Play Store (if not installed)"
echo "  2. Open Expo Go app"
echo "  3. Scan the QR code that appears below"
echo "  4. Your app will load!"
echo ""
echo "📸 PERFECT FOR:"
echo "  • Taking screenshots for Google Play"
echo "  • Testing before friends download"
echo "  • Recording demo videos"
echo "  • Final testing"
echo ""
echo "Press Ctrl+C to stop the server when done."
echo ""
echo "Starting in 3 seconds..."
sleep 3

# Start with clear cache
npm start -- --clear

