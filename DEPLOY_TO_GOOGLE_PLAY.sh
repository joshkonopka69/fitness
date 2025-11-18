#!/bin/bash

# 🚀 DEPLOY YOUR APP TO GOOGLE PLAY - FINAL STEP
# Run this script in your terminal to build your app

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║  🚀  FITNESSGURU - GOOGLE PLAY DEPLOYMENT                     ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Starting Android Production Build...${NC}"
echo ""
echo "This build will:"
echo "  ✓ Generate a new Android Keystore (stored securely on Expo servers)"
echo "  ✓ Build an AAB file for Google Play"
echo "  ✓ Take approximately 15-30 minutes"
echo ""
echo -e "${YELLOW}⚠️  When prompted 'Generate a new Android Keystore?' - Type: Y${NC}"
echo ""
echo "Press ENTER to continue..."
read

cd /home/hubi/AttendanceApp

# Start the build
eas build --platform android --profile production

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}║  ✅  BUILD SUBMITTED TO EAS!                                   ║${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 NEXT STEPS:${NC}"
echo ""
echo "1. Monitor your build:"
echo "   → https://expo.dev/accounts/hubertdomagala/projects/fitnessguru/builds"
echo ""
echo "2. Once complete (15-30 min), download the .aab file"
echo ""
echo "3. Upload to Google Play Console:"
echo "   → Open: https://play.google.com/console"
echo "   → Navigate to: FitnessGuru → Internal testing"
echo "   → Create new release → Upload the .aab file"
echo ""
echo "4. Set up your store listing:"
echo "   - App name: FitnessGuru"
echo "   - Short description (80 chars)"
echo "   - Full description"
echo "   - Screenshots (at least 2)"
echo "   - App icon"
echo ""
echo -e "${GREEN}🎉 Your app will be ready for beta testing!${NC}"
echo ""

