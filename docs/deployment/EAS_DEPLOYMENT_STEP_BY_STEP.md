# 🚀 EAS DEPLOYMENT - STEP BY STEP

## ⚡ **QUICK START: DEPLOY IN 3 HOURS**

This guide will help you deploy TrainTrack to Google Play Store.

---

## 📋 **PREREQUISITES**

### **What You Need:**
- [ ] Google account
- [ ] $25 for Google Play Developer account (one-time)
- [ ] 3 hours of time
- [ ] Computer with internet

### **What You Have:**
- ✅ Working app
- ✅ Supabase backend
- ✅ Beautiful UI
- ✅ All features working

**You're ready!** Let's go! 🚀

---

## 🎯 **STEP 1: CREATE APP ICONS** (30 minutes)

### **Option A: Use Icon Generator (Recommended)**

1. Go to https://icon.kitchen/

2. Design your icon:
   - Base: Solid color (#00FF88 - your primary green)
   - Text: "TT" or dumbbell emoji 💪
   - Shape: Circle or square
   - Style: Modern

3. Click "Generate"

4. Download "Android Adaptive Icons"

5. Replace files:
   ```bash
   # Copy downloaded files to:
   AttendanceApp/assets/images/icon.png
   AttendanceApp/assets/images/adaptive-icon.png
   AttendanceApp/assets/images/splash-icon.png
   ```

### **Option B: Use Existing Design**

If you have a logo:
1. Export as 1024x1024px PNG
2. Use https://appicon.co/ to generate all sizes
3. Download and copy to `assets/images/`

### **Verify:**
```bash
ls -la assets/images/
# Should see: icon.png, adaptive-icon.png, splash-icon.png
```

---

## 📄 **STEP 2: CREATE LEGAL DOCUMENTS** (30 minutes)

### **Privacy Policy:**

1. Go to https://www.privacypolicygenerator.info/

2. Fill in:
   - **App name:** TrainTrack
   - **App description:** Personal trainer management app
   - **Company:** Your name/company
   - **Email:** your.email@gmail.com
   - **Data collected:**
     - Name
     - Email address
     - Phone number
     - Training session data
     - Payment information
     - Client information
   - **Third parties:**
     - Supabase (data storage)
     - Google Play Services
   - **Location:** Poland (or your country)
   - **GDPR:** Yes (if targeting EU)

3. Generate & copy text

### **Terms of Service:**

1. Go to https://www.termsofservicegenerator.net/

2. Fill in similar information

3. Generate & copy text

### **Host Documents:**

**Option A: GitHub Pages (Free)**
```bash
# Create public repo: traintrack-legal
# Add files:
- privacy-policy.html
- terms-of-service.html

# Enable GitHub Pages in settings
# URLs will be:
# https://yourusername.github.io/traintrack-legal/privacy-policy.html
# https://yourusername.github.io/traintrack-legal/terms-of-service.html
```

**Option B: Notion (Easiest)**
1. Create Notion page
2. Paste privacy policy
3. Click "Share" → "Publish to web"
4. Copy URL
5. Repeat for terms

**Save URLs - you'll need them for Google Play!**

---

## 🔧 **STEP 3: SETUP EAS BUILD** (30 minutes)

### **Install EAS CLI:**

```bash
# Install globally
npm install -g eas-cli

# Login to Expo account
eas login
# Enter your Expo credentials (create account if needed)

# Verify
eas whoami
```

### **Configure EAS:**

```bash
cd /home/hubi/AttendanceApp

# Initialize EAS
eas build:configure
# Choose: All (when asked about platforms)
```

This creates `eas.json`. Update it:

```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### **Update app.json:**

```bash
cd /home/hubi/AttendanceApp
```

Update these fields in `app.json`:

```json
{
  "expo": {
    "name": "TrainTrack",
    "slug": "traintrack",
    "version": "1.0.0",
    "android": {
      "package": "com.YOURNAME.traintrack",  // Change YOURNAME!
      "versionCode": 1,
      "permissions": [
        "CALL_PHONE"
      ],
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#0A0A0A"
      }
    },
    "extra": {
      "eas": {
        "projectId": "will-be-auto-generated"
      }
    }
  }
}
```

**Important:** Change `com.YOURNAME.traintrack` to something unique!

Example: `com.jan kowalski.traintrack` → `com.jankowalski.traintrack`

---

## 🏗️ **STEP 4: BUILD APK** (30 minutes)

### **First Test Build (APK for testing):**

```bash
cd /home/hubi/AttendanceApp

# Build preview APK
eas build --profile preview --platform android
```

**What happens:**
1. EAS uploads your code
2. Builds APK in the cloud (15-20 min)
3. Gives you download link

**Download & Test:**
```bash
# After build completes, you'll see:
# ✅ Build successful!
# 📱 Download: https://expo.dev/...

# Download APK to your phone
# Install and test thoroughly!
```

### **Test Checklist:**
- [ ] App opens
- [ ] Can sign up/login
- [ ] Can add clients
- [ ] Can create sessions
- [ ] Calendar swipes work
- [ ] Payments work
- [ ] No crashes

**If all good → proceed to production build!**

---

## 📦 **STEP 5: BUILD PRODUCTION AAB** (30 minutes)

### **What's AAB?**
Android App Bundle - optimized format for Google Play Store.

### **Build:**

```bash
cd /home/hubi/AttendanceApp

# Build production AAB
eas build --profile production --platform android
```

**What happens:**
1. EAS asks for a keystore (say YES to generate)
2. Builds AAB (20-30 min)
3. Gives you download link

**Important:** EAS will manage your signing key. Keep your Expo account safe!

**Download AAB:**
```bash
# After build completes:
# ✅ Build successful!
# 📦 Download: https://expo.dev/...

# Download the .aab file to your computer
```

---

## 🏪 **STEP 6: GOOGLE PLAY CONSOLE SETUP** (60 minutes)

### **Create Developer Account:**

1. Go to https://play.google.com/console

2. Click "Create Account"

3. Choose "Organization" (for business) or "Individual"

4. Pay $25 registration fee

5. Complete identity verification (may take 1-2 days)

### **Create New App:**

1. Click "Create app"

2. Fill in:
   - **App name:** TrainTrack
   - **Default language:** Polish (or English)
   - **App or game:** App
   - **Free or paid:** Free
   - **Declarations:** Check all boxes

3. Click "Create app"

### **App Dashboard:**

You'll see tasks to complete. Let's do them:

#### **Task 1: Set up app**

**Store Listing:**
- **App name:** TrainTrack
- **Short description (80 chars):**
  ```
  Simple app for personal trainers to track clients, payments & sessions
  ```
- **Full description (4000 chars):**
  ```
  TrainTrack - The Simplest App for Personal Trainers 💪

  Manage your fitness coaching business in one place!

  ✅ FEATURES:

  📅 CALENDAR & SESSIONS
  - Create training sessions (Personal, Group, BJJ, Gym, HIIT, Yoga)
  - Track start/end times
  - Add session notes
  - Swipe between days

  👥 CLIENT MANAGEMENT
  - Store client information (name, phone, notes)
  - Unlimited notes per client
  - Track training history
  - Call clients directly from app

  💰 PAYMENT TRACKING
  - Record payments (paid or waiting)
  - Track balance owed per client
  - View payment history
  - 2-week revenue graph

  ✅ ATTENDANCE
  - Mark who attended each session
  - Simple checklist interface
  - Quick search for clients

  🎯 PERFECT FOR:
  - Personal trainers
  - Fitness coaches
  - Gym instructors
  - Group class teachers

  💎 WHY TRAINTRACK?
  SIMPLE - No complex features, just what you need
  FAST - Add clients, record payments in seconds
  MOBILE-FIRST - Perfect for use in the gym
  SECURE - Your data is safe and encrypted

  🇵🇱 Made for Polish trainers, available worldwide!

  Start managing your fitness business professionally today! 💪
  ```

- **App icon:** Upload your 512x512px icon
- **Feature graphic:** Upload 1024x500px banner (create in Canva)
- **Screenshots:** Upload 2-8 screenshots (1080x1920px)

**How to take screenshots:**
```bash
# Open app in emulator or phone
# Take screenshots of:
1. Calendar view
2. Day view
3. Clients list
4. Client detail
5. Attendance
6. Payments
7. Profile

# Use phone screenshot tool or:
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png
```

**Store Settings:**
- **App category:** Health & Fitness
- **Tags:** personal trainer, fitness, gym, coaching
- **Contact email:** your.email@gmail.com
- **Privacy policy URL:** (paste your URL from Step 2)

Click "Save"

#### **Task 2: Content Rating**

1. Click "Start questionnaire"
2. Select "No" for violence, sexual content, etc.
3. App is for trainers (professional use)
4. Submit
5. Get rating: Usually "Everyone" or "Teen"

#### **Task 3: Target Audience**

- **Target age:** 18+ (personal trainers)
- **Target countries:** Poland (or worldwide)

#### **Task 4: News App Declaration**

- Select "No" (not a news app)

#### **Task 5: COVID-19 Contact Tracing**

- Select "No"

#### **Task 6: Data Safety**

Important! Be honest:

**Data collected:**
- [ ] Location: No
- [x] Personal info: Yes (name, email)
- [x] Financial info: Yes (payment records)
- [x] Health info: No
- [x] Messages: No
- [x] Photos: No
- [x] Files: No
- [x] Calendar: Yes (training sessions)
- [x] Contacts: No
- [x] Device ID: No

**Data usage:**
- All data used for app functionality
- Not shared with third parties
- Encrypted in transit
- Users can request deletion

**Security practices:**
- Data encrypted in transit (HTTPS)
- Data encrypted at rest (Supabase)
- Users can delete data
- Link to privacy policy

Save & continue

---

## 📤 **STEP 7: UPLOAD AAB** (10 minutes)

### **Create Release:**

1. In Google Play Console, go to "Production"

2. Click "Create new release"

3. Upload AAB:
   - Click "Upload"
   - Select your `.aab` file from Step 5
   - Wait for upload (1-2 min)

4. Release name: "1.0.0 - Initial Release"

5. Release notes (English):
   ```
   Initial release of TrainTrack!

   Features:
   - Client management
   - Session scheduling
   - Payment tracking
   - Attendance marking
   - Revenue analytics

   Perfect for personal trainers and fitness coaches!
   ```

6. Release notes (Polish):
   ```
   Pierwsza wersja TrainTrack!

   Funkcje:
   - Zarządzanie klientami
   - Planowanie zajęć
   - Śledzenie płatności
   - Obecność na zajęciach
   - Analityka przychodów

   Idealne dla trenerów personalnych!
   ```

7. Click "Save"

---

## ✅ **STEP 8: SUBMIT FOR REVIEW** (5 minutes)

### **Final Checklist:**
- [x] App icon uploaded
- [x] Screenshots uploaded
- [x] Description written
- [x] Privacy policy linked
- [x] Content rating completed
- [x] Data safety completed
- [x] AAB uploaded
- [x] Release notes written

### **Submit:**

1. Review everything one last time

2. Click "Send for review"

3. Google will review (typically 3-7 days)

4. You'll receive email when:
   - Review starts
   - App is approved (or rejected)

### **What Google Checks:**
- App doesn't crash
- Privacy policy present
- No prohibited content
- Data safety accurate
- Metadata complete

**Your app should pass easily!** ✅

---

## 🎉 **STEP 9: AFTER APPROVAL**

### **Once Approved:**

1. **Go Live:**
   - App appears in Google Play Store
   - Anyone can download
   - URL: `https://play.google.com/store/apps/details?id=com.yourname.traintrack`

2. **Share:**
   - Post on social media
   - Share with trainer friends
   - Add link to your website

3. **Monitor:**
   - Check reviews daily
   - Respond to user feedback
   - Fix reported bugs

### **Update App (Future):**

```bash
# 1. Update version in app.json:
"version": "1.0.1",  // Increment
"versionCode": 2,     // Increment

# 2. Build new AAB:
eas build --profile production --platform android

# 3. Upload to Google Play Console
# 4. Add release notes
# 5. Submit

# Updates typically approved in 1-2 days
```

---

## 🐛 **TROUBLESHOOTING**

### **Common Issues:**

**Build fails:**
```bash
# Clear cache and try again:
eas build --profile production --platform android --clear-cache
```

**"Package name already exists":**
```bash
# Change package name in app.json:
"package": "com.yourname.traintrack2"
```

**"Privacy policy not reachable":**
- Verify URL works in incognito browser
- Must be HTTPS
- Must load within 5 seconds

**"Crashes on startup":**
- Check Supabase URL/keys in code
- Test APK thoroughly before submitting AAB

**"Rejected for policy violations":**
- Read rejection email carefully
- Fix issues mentioned
- Resubmit

---

## 📊 **TIMELINE SUMMARY**

| Step | Time | Description |
|------|------|-------------|
| 1. Icons | 30 min | Create & add icons |
| 2. Legal | 30 min | Privacy policy & Terms |
| 3. EAS Setup | 30 min | Configure build system |
| 4. Test APK | 30 min | Build & test |
| 5. Production AAB | 30 min | Final build |
| 6. Play Console | 60 min | Setup account & listing |
| 7. Upload | 10 min | Upload AAB |
| 8. Submit | 5 min | Send for review |
| **Total** | **3-4 hours** | Active work |
| Google Review | 3-7 days | Waiting |

---

## 💰 **COSTS**

- Google Play Developer: $25 (one-time)
- Domain (optional): $12/year
- Everything else: **FREE!** ✅

---

## ✅ **QUICK COMMAND REFERENCE**

```bash
# Install EAS
npm install -g eas-cli

# Login
eas login

# Configure
cd /home/hubi/AttendanceApp
eas build:configure

# Build test APK
eas build --profile preview --platform android

# Build production AAB
eas build --profile production --platform android

# Check build status
eas build:list

# Update and rebuild
# (after changing code)
eas build --profile production --platform android --clear-cache
```

---

## 🚀 **YOU'RE READY TO DEPLOY!**

**Your app is solid and ready for the world!** 💪

**Next steps:**
1. Follow this guide step-by-step
2. Take your time (3-4 hours)
3. Test thoroughly
4. Submit!

**Questions?** Just ask! I'm here to help! 🎯

**After deployment, read:**
- `DEPLOYMENT_AND_MONETIZATION_ROADMAP.md` - For subscription setup
- Focus on RevenueCat integration next!

**Good luck! You've got this!** 🚀💚

