#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing TrainTrack App Structure...\n');

// Test 1: Check critical files exist
const criticalFiles = [
  'App.tsx',
  'package.json',
  'app.json',
  'src/contexts/AuthContext.tsx',
  'src/lib/supabase.ts',
  'src/navigation/AppNavigator.tsx',
  'src/theme/colors.ts',
  'src/screens/auth/LoginScreen.tsx',
  'src/screens/auth/SignupScreen.tsx',
  'src/screens/calendar/CalendarScreen.tsx',
  'src/screens/calendar/CreateSessionScreen.tsx',
  'src/screens/clients/ClientsScreen.tsx',
  'src/screens/clients/AddClientScreen.tsx',
  'src/screens/attendance/AttendanceScreen.tsx',
  'src/screens/payments/PaymentAlertsScreen.tsx'
];

console.log('✅ Testing file structure...');
let allFilesExist = true;
criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING!`);
    allFilesExist = false;
  }
});

// Test 2: Check package.json configuration
console.log('\n✅ Testing package.json...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (packageJson.main === 'App.tsx') {
  console.log('  ✅ Main entry point: App.tsx');
} else {
  console.log(`  ❌ Main entry point: ${packageJson.main} (should be App.tsx)`);
  allFilesExist = false;
}

if (!packageJson.dependencies['expo-router']) {
  console.log('  ✅ expo-router removed');
} else {
  console.log('  ❌ expo-router still present');
  allFilesExist = false;
}

// Test 3: Check app.json configuration
console.log('\n✅ Testing app.json...');
const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
if (appJson.expo.main === 'App.tsx') {
  console.log('  ✅ App.json main: App.tsx');
} else {
  console.log(`  ❌ App.json main: ${appJson.expo.main} (should be App.tsx)`);
  allFilesExist = false;
}

if (appJson.expo.userInterfaceStyle === 'dark') {
  console.log('  ✅ Dark theme enabled');
} else {
  console.log(`  ❌ Theme: ${appJson.expo.userInterfaceStyle} (should be dark)`);
  allFilesExist = false;
}

// Test 4: Check environment variables
console.log('\n✅ Testing environment variables...');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  if (envContent.includes('EXPO_PUBLIC_SUPABASE_URL') && envContent.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY')) {
    console.log('  ✅ Supabase credentials found');
  } else {
    console.log('  ❌ Supabase credentials missing');
    allFilesExist = false;
  }
} else {
  console.log('  ❌ .env file missing');
  allFilesExist = false;
}

// Test 5: Check App.tsx content
console.log('\n✅ Testing App.tsx...');
const appContent = fs.readFileSync('App.tsx', 'utf8');
if (appContent.includes('AuthProvider') && appContent.includes('AppNavigator')) {
  console.log('  ✅ App.tsx has proper structure');
} else {
  console.log('  ❌ App.tsx structure incorrect');
  allFilesExist = false;
}

// Test 6: Check navigation structure
console.log('\n✅ Testing navigation...');
const navContent = fs.readFileSync('src/navigation/AppNavigator.tsx', 'utf8');
if (navContent.includes('AuthStack') && navContent.includes('MainTabs') && navContent.includes('MainStack')) {
  console.log('  ✅ Navigation structure complete');
} else {
  console.log('  ❌ Navigation structure incomplete');
  allFilesExist = false;
}

// Test 7: Check theme
console.log('\n✅ Testing theme...');
if (fs.existsSync('src/theme/colors.ts')) {
  const themeContent = fs.readFileSync('src/theme/colors.ts', 'utf8');
  if (themeContent.includes('colors') && themeContent.includes('spacing')) {
    console.log('  ✅ Theme system present');
  } else {
    console.log('  ❌ Theme system incomplete');
    allFilesExist = false;
  }
} else {
  console.log('  ❌ Theme file missing');
  allFilesExist = false;
}

// Final result
console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('🎉 ALL TESTS PASSED! Your TrainTrack app is ready!');
  console.log('\n📱 To test with Expo Go:');
  console.log('  1. Run: npx expo start');
  console.log('  2. Scan QR code with Expo Go');
  console.log('  3. You should see the TrainTrack login screen!');
} else {
  console.log('❌ SOME TESTS FAILED! App needs fixes.');
  console.log('\n🔧 Issues found that need to be resolved.');
}
console.log('='.repeat(50));
