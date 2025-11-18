#!/usr/bin/env node

/**
 * TrainTrack Setup Verification Script
 * Run this to check if your setup is correct before starting the app
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 TrainTrack Setup Verification\n');

let hasErrors = false;
let hasWarnings = false;

// Check 1: package.json main entry
console.log('1️⃣  Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (packageJson.main === 'node_modules/expo/AppEntry.js') {
    console.log('   ✅ Main entry point is correct');
  } else {
    console.log(`   ❌ Main entry point is wrong: "${packageJson.main}"`);
    console.log('      Expected: "node_modules/expo/AppEntry.js"');
    hasErrors = true;
  }
} catch (error) {
  console.log('   ❌ Could not read package.json');
  hasErrors = true;
}

// Check 2: .env file
console.log('\n2️⃣  Checking .env file...');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  
  if (envContent.includes('EXPO_PUBLIC_SUPABASE_URL=')) {
    const urlMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/);
    if (urlMatch && urlMatch[1].trim() && !urlMatch[1].includes('YOUR_PROJECT')) {
      console.log('   ✅ EXPO_PUBLIC_SUPABASE_URL is set');
    } else {
      console.log('   ⚠️  EXPO_PUBLIC_SUPABASE_URL contains placeholder value');
      console.log('      Update it with your actual Supabase project URL');
      hasWarnings = true;
    }
  } else {
    console.log('   ❌ EXPO_PUBLIC_SUPABASE_URL is missing');
    hasErrors = true;
  }

  if (envContent.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY=')) {
    const keyMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
    if (keyMatch && keyMatch[1].trim() && !keyMatch[1].includes('YOUR_ANON_KEY')) {
      console.log('   ✅ EXPO_PUBLIC_SUPABASE_ANON_KEY is set');
    } else {
      console.log('   ⚠️  EXPO_PUBLIC_SUPABASE_ANON_KEY contains placeholder value');
      console.log('      Update it with your actual Supabase anon key');
      hasWarnings = true;
    }
  } else {
    console.log('   ❌ EXPO_PUBLIC_SUPABASE_ANON_KEY is missing');
    hasErrors = true;
  }
} else {
  console.log('   ❌ .env file not found');
  console.log('      Create a .env file in the root directory with:');
  console.log('      EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.log('      EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
  hasErrors = true;
}

// Check 3: Critical directories
console.log('\n3️⃣  Checking directory structure...');
const requiredDirs = [
  'src',
  'src/lib',
  'src/contexts',
  'src/screens',
  'src/navigation',
  'src/theme',
];

let allDirsExist = true;
requiredDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`   ✅ ${dir}/`);
  } else {
    console.log(`   ❌ ${dir}/ not found`);
    allDirsExist = false;
    hasErrors = true;
  }
});

// Check 4: Critical files
console.log('\n4️⃣  Checking critical files...');
const requiredFiles = [
  'App.tsx',
  'app.json',
  'src/lib/supabase.ts',
  'src/contexts/AuthContext.tsx',
  'src/navigation/AppNavigator.tsx',
  'src/theme/colors.ts',
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} not found`);
    hasErrors = true;
  }
});

// Check 5: node_modules
console.log('\n5️⃣  Checking dependencies...');
if (fs.existsSync('node_modules')) {
  console.log('   ✅ node_modules exists');
  
  // Check for critical packages
  const criticalPackages = [
    '@supabase/supabase-js',
    '@react-navigation/native',
    'expo',
    'react-native-calendars',
  ];
  
  criticalPackages.forEach(pkg => {
    const pkgPath = path.join('node_modules', pkg);
    if (fs.existsSync(pkgPath)) {
      console.log(`   ✅ ${pkg}`);
    } else {
      console.log(`   ⚠️  ${pkg} not found - run npm install`);
      hasWarnings = true;
    }
  });
} else {
  console.log('   ❌ node_modules not found');
  console.log('      Run: npm install');
  hasErrors = true;
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ ERRORS FOUND - Please fix the issues above before running the app');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  WARNINGS - The app may not work correctly');
  console.log('   Please update your .env file with real Supabase credentials');
  process.exit(0);
} else {
  console.log('✅ ALL CHECKS PASSED!');
  console.log('\n🚀 You\'re ready to start the app:');
  console.log('   npm start');
  console.log('\nOr test with:');
  console.log('   npm run dev');
  process.exit(0);
}

