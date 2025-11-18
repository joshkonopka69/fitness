# 🚀 DEPLOY YOUR APP TO GOOGLE PLAY - SIMPLE STEPS

## ✅ **EVERYTHING IS READY!**

Your app is configured, backed up, and ready to deploy to Google Play.

---

## 🎯 **STEP 1: OPEN A NEW TERMINAL**

1. Open a **new terminal window** on your computer
2. Navigate to your project:
   ```bash
   cd /home/hubi/AttendanceApp
   ```

---

## 🎯 **STEP 2: RUN THE DEPLOYMENT SCRIPT**

Run this single command:

```bash
./DEPLOY_TO_GOOGLE_PLAY.sh
```

**When prompted:**
- **"Generate a new Android Keystore?"** → Type `Y` and press Enter

That's it! The build will start.

---

## ⏰ **STEP 3: WAIT FOR BUILD (15-30 MINUTES)**

While building, you can:
- ☕ Get a coffee
- 📊 Monitor progress: https://expo.dev/accounts/hubertdomagala/projects/fitnessguru/builds
- 📱 Prepare your Google Play Console

---

## 📦 **STEP 4: DOWNLOAD YOUR .AAB FILE**

Once the build completes (you'll get an email):
1. Go to the build URL you received
2. Download the `.aab` file
3. Save it to your computer

---

## 🎮 **STEP 5: UPLOAD TO GOOGLE PLAY**

### 5.1. Open Google Play Console
→ https://play.google.com/console

### 5.2. Select Your App
- Click on "FitnessGuru" (or create new app if needed)

### 5.3. Go to Internal Testing
1. In left sidebar: **Testing → Internal testing**
2. Click **"Create new release"**
3. Click **"Upload"** and select your `.aab` file
4. Set release notes (e.g., "Initial beta release")
5. Click **"Review release"**
6. Click **"Start rollout to Internal testing"**

---

## 📝 **STEP 6: COMPLETE STORE LISTING** (Required before publishing)

### 6.1. App Information
- **App name:** FitnessGuru
- **Short description** (80 chars max):
  ```
  Track client attendance, sessions & payments. Perfect for fitness coaches!
  ```
- **Full description** (4000 chars max):
  ```
  FitnessGuru is the ultimate app for fitness coaches and personal trainers.
  
  ✓ Client Management - Track all your clients in one place
  ✓ Attendance Tracking - Quick check-in for training sessions
  ✓ Payment Tracking - Monitor payments and overdue amounts
  ✓ Calendar View - Visualize your training schedule
  ✓ Session Notes - Add notes to each training session
  ✓ Statistics - Track your business growth
  
  Features:
  • 30-day free trial
  • Cloud sync across devices
  • Secure payment processing with Stripe
  • Beautiful, modern interface
  • Available in English and Polish
  
  Perfect for:
  • Personal trainers
  • Fitness coaches
  • Gym instructors
  • Sports coaches
  
  Start your 30-day free trial today!
  ```

### 6.2. Graphics (Required)
Upload these in Google Play Console:

**App Icon** (512x512):
- Location: `/home/hubi/AttendanceApp/assets/images/icon.png`
- (You may need to resize to 512x512)

**Feature Graphic** (1024x500):
- Create a banner with your app name and tagline
- Use Canva or any design tool

**Screenshots** (At least 2):
- Take screenshots from your app running on Expo Go
- Phone screenshots: 16:9 ratio recommended
- Minimum 2, maximum 8

### 6.3. Categorization
- **App category:** Health & Fitness
- **Content rating:** Everyone (complete questionnaire)

### 6.4. Privacy Policy
Use the one at: `/home/hubi/AttendanceApp/docs/legal/privacy-policy.html`

Upload it to a public URL or GitHub Pages, then paste the URL.

---

## 👥 **STEP 7: ADD BETA TESTERS**

### 7.1. In Internal Testing:
1. Go to **"Testers"** tab
2. Click **"Create email list"**
3. Add tester emails (your friends):
   ```
   friend1@example.com
   friend2@example.com
   ```
4. Save

### 7.2. Share Test Link:
- Copy the **opt-in URL**
- Send to your friends
- They can install and test your app!

---

## 🎉 **YOUR APP IS LIVE!**

Congratulations! Your app is now:
- ✅ Built and ready
- ✅ Available for beta testing
- ✅ Using LIVE Stripe payments
- ✅ Ready to make money

---

## 💰 **MANAGING FREE PREMIUM FOR FRIENDS**

To give free premium to friends:

1. **Get their email from the app**
2. **Open Supabase SQL Editor:**
   → https://supabase.com/dashboard/project/qkkmurwntbkhvbezbhcz/sql
3. **Run this query:**
   ```sql
   UPDATE coaches
   SET 
     is_premium = true,
     subscription_status = 'active',
     trial_end_date = NOW() + INTERVAL '100 years'
   WHERE email = 'friend@example.com';
   ```

This gives them lifetime free premium!

---

## 📱 **UPDATING YOUR APP IN THE FUTURE**

To push updates:
1. Make your code changes
2. Commit to git:
   ```bash
   git add -A
   git commit -m "Your update message"
   ```
3. Increment version in `app.json`:
   ```json
   "version": "1.0.1"  // Change to 1.0.2, etc.
   ```
4. Build again:
   ```bash
   eas build --platform android --profile production
   ```
5. Upload new .aab to Google Play Console

Users will get automatic updates through Google Play!

---

## 📈 **MARKETING IDEAS**

1. **Local Gyms:**
   - Visit gyms in your area
   - Offer free trials to trainers
   
2. **Social Media:**
   - Post screenshots on Instagram
   - Join fitness coach Facebook groups
   - Share on LinkedIn
   
3. **Polish Fitness Forums:**
   - Post on Polish fitness websites
   - Offer special discount codes
   
4. **YouTube:**
   - Create tutorial videos
   - Show how it helps trainers

---

## 🆘 **NEED HELP?**

**Build Fails?**
- Check: https://expo.dev/accounts/hubertdomagala/projects/fitnessguru/builds
- Look at error logs
- Most common issue: Environment variables

**Google Play Rejects?**
- Complete all required fields in Store Listing
- Upload all required graphics
- Fill out Content Rating questionnaire

**Stripe Not Working?**
- Verify keys in `.env` file match your Stripe dashboard
- Check Supabase Edge Function has correct secret key

---

## 🎊 **YOU'RE READY TO LAUNCH!**

**Run this now:**
```bash
cd /home/hubi/AttendanceApp
./DEPLOY_TO_GOOGLE_PLAY.sh
```

**Good luck! 🚀**

