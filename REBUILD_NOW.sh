#!/bin/bash

# 🔧 REBUILD WITH FIXED CODE

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║  🔧  RESTARTING BUILD WITH FIXED CODE                          ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

cd /home/hubi/AttendanceApp

echo "✅ Icon paths fixed:"
echo "   • WelcomeScreen.tsx - using assets/images/icon.png"
echo "   • LoginScreen.tsx - using assets/images/icon.png"
echo ""
echo "✅ Code committed to git"
echo ""
echo "🚀 Starting new build..."
echo ""
echo "⚠️  When prompted 'Generate a new Android Keystore?' → Type: N"
echo "   (We already have a keystore from the first build)"
echo ""
echo "Press ENTER to start the build..."
read

# Start the build
eas build --platform android --profile production

echo ""
echo "✅ Build started!"
echo ""
echo "Monitor at:"
echo "→ https://expo.dev/accounts/hubertdomagala/projects/fitnessguru/builds"
echo ""

