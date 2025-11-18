#!/bin/bash

# 🚀 AUTOMATIC DEPLOYMENT TO GOOGLE PLAY
# This script will auto-answer prompts and start the build

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║  🚀  FITNESSGURU - AUTOMATIC GOOGLE PLAY DEPLOYMENT           ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

cd /home/hubi/AttendanceApp

# Try to build with auto-yes for keystore generation
echo "📦 Starting build process..."
echo ""

# Export yes response for interactive prompts
export CI=1

# Start build and auto-answer with yes
(echo "Y" | eas build --platform android --profile production) || {
    echo ""
    echo "⚠️  Interactive prompt required!"
    echo ""
    echo "Please run this command manually in a REAL terminal:"
    echo ""
    echo "  cd /home/hubi/AttendanceApp"
    echo "  eas build --platform android --profile production"
    echo ""
    echo "When asked 'Generate a new Android Keystore?' type: Y"
    echo ""
    exit 1
}

