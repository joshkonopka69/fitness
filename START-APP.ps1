# 🏃 START APP LOCALLY WITH EXPO GO

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                                ║" -ForegroundColor Cyan
Write-Host "║  📱  START FITNESSGURU LOCALLY                                 ║" -ForegroundColor Cyan
Write-Host "║                                                                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "🚀 Starting Expo development server..." -ForegroundColor Green
Write-Host ""
Write-Host "This will:"
Write-Host "  ✓ Clear cache"
Write-Host "  ✓ Start Metro bundler"
Write-Host "  ✓ Show QR code to scan"
Write-Host ""
Write-Host "📱 On your phone:" -ForegroundColor Yellow
Write-Host "  1. Install 'Expo Go' from Play Store (if not installed)"
Write-Host "  2. Open Expo Go app"
Write-Host "  3. Scan the QR code that appears below"
Write-Host "  4. Your app will load!"
Write-Host ""
Write-Host "📸 PERFECT FOR:" -ForegroundColor Magenta
Write-Host "  • Taking screenshots for Google Play"
Write-Host "  • Testing before friends download"
Write-Host "  • Recording demo videos"
Write-Host "  • Final testing"
Write-Host ""
Write-Host "Press Ctrl+C to stop the server when done." -ForegroundColor Red
Write-Host ""
Write-Host "Starting in 3 seconds..."
Start-Sleep -Seconds 3

# Start with clear cache (without fixed port to avoid conflicts)
npx expo start --clear

