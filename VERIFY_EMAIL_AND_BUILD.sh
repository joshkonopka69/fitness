#!/bin/bash

# 🔧 VERIFY EMAIL & BUILD APP

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║  📧  EMAIL VERIFICATION REQUIRED                               ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "Your Expo account is active, but email needs verification."
echo ""
echo "STEP 1: Check your email"
echo "  → hubert.domagalaa@gmail.com"
echo "  → Look for 'Verify your email' from Expo"
echo ""
echo "STEP 2: If no email found, resend verification:"
echo "  → Open: https://expo.dev/settings"
echo "  → Click 'Resend verification email'"
echo ""
echo "STEP 3: Once verified, run the build:"
echo "  → cd /home/hubi/AttendanceApp"
echo "  → eas build --platform android --profile production"
echo "  → Answer 'Y' when asked about keystore"
echo ""

read -p "Press Enter to open Expo settings in browser..."

# Try to open browser
if command -v xdg-open &> /dev/null; then
    xdg-open "https://expo.dev/settings" &
elif command -v gnome-open &> /dev/null; then
    gnome-open "https://expo.dev/settings" &
else
    echo "Open this URL manually: https://expo.dev/settings"
fi

echo ""
echo "After verifying email, run:"
echo ""
echo "  cd /home/hubi/AttendanceApp"
echo "  eas build --platform android --profile production"
echo ""

