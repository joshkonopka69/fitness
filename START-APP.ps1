# FitnessGuru - Start App with Expo Go
# =====================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   FITNESSGURU - Expo Go Starter" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get WiFi IP address
$wifiIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -match "Wi-Fi|WiFi|Wireless" -and $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress

if ($wifiIP) {
    Write-Host "Your WiFi IP: $wifiIP" -ForegroundColor Green
} else {
    $wifiIP = "192.168.0.188"
    Write-Host "Using default IP: $wifiIP" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "  1. Make sure phone is on SAME WiFi network"
Write-Host "  2. Open Expo Go app on your phone"
Write-Host "  3. Scan the QR code that appears below"
Write-Host ""
Write-Host "Starting Expo in 3 seconds..." -ForegroundColor Green
Start-Sleep -Seconds 3

# Set environment variable for LAN access
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $wifiIP

# Start Expo with LAN mode
npx expo start --lan --clear
