# Supabase Email & Password Reset Setup Guide

## 🔧 STEP 1: Run SQL Script First

1. Go to **Supabase Dashboard** → Your Project → **SQL Editor**
2. Copy and run the contents of: `database/SUPABASE_COMPLETE_SETUP.sql`
3. This fixes the registration RLS policy

---

## 📧 STEP 2: Configure Email Templates

### Go to: Authentication → Email Templates

1. In Supabase Dashboard, click **Authentication** in sidebar
2. Click **Email Templates** tab

### Configure "Confirm signup" Template:

```
Subject: Confirm your FitnessGuru account

Body:
<h2>Welcome to FitnessGuru! 💪</h2>

<p>Hi there,</p>

<p>Thanks for signing up! Please confirm your email address by clicking the button below:</p>

<p><a href="{{ .ConfirmationURL }}" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Confirm Email</a></p>

<p>If the button doesn't work, copy and paste this link:</p>
<p>{{ .ConfirmationURL }}</p>

<p>Best regards,<br>The FitnessGuru Team</p>
```

### Configure "Reset Password" Template:

```
Subject: Reset your FitnessGuru password

Body:
<h2>Password Reset Request 🔐</h2>

<p>Hi there,</p>

<p>We received a request to reset your password. Click the button below to create a new password:</p>

<p><a href="{{ .ConfirmationURL }}" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Reset Password</a></p>

<p>If you didn't request this, you can safely ignore this email.</p>

<p>This link will expire in 24 hours.</p>

<p>Best regards,<br>The FitnessGuru Team</p>
```

---

## ⚙️ STEP 3: Configure Auth Settings

### Go to: Authentication → URL Configuration

Set these URLs:

| Setting | Value |
|---------|-------|
| **Site URL** | `fitnessguru://` |
| **Redirect URLs** | Add these: |
| | `fitnessguru://` |
| | `fitnessguru://reset-password` |
| | `fitnessguru://confirm-email` |
| | `exp://192.168.0.188:8081` (for local testing) |
| | `exp://192.168.0.188:8082` |
| | `exp://192.168.0.188:8083` |

### Go to: Authentication → Providers

Make sure **Email** provider is enabled with:
- ✅ Enable Email Signup
- ✅ Confirm Email (toggle ON for email verification)
- ✅ Secure Email Change

---

## 📱 STEP 4: Configure Deep Linking in App

The app already has deep linking configured in `app.json`:

```json
{
  "expo": {
    "scheme": "fitnessguru"
  }
}
```

---

## 🔄 STEP 5: Test the Flow

### Registration Flow:
1. User enters email + password
2. User receives confirmation email
3. User clicks link → opens app → email confirmed
4. User can now log in

### Password Reset Flow:
1. User clicks "Forgot Password"
2. User enters email
3. User receives reset email
4. User clicks link → opens app with reset token
5. App shows password reset screen

---

## 🚨 Important Notes

### For Local Development (Expo Go):
- Email links will open in browser, not app
- This is normal for development
- In production build (APK/IPA), deep links work properly

### SMTP Setup (Optional - for custom email):
By default, Supabase uses their own email service (limited to 4 emails/hour in free tier).

For production, configure your own SMTP:
1. Go to **Project Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Add your SMTP provider (SendGrid, Mailgun, etc.)

---

## ✅ Checklist

- [ ] Run `SUPABASE_COMPLETE_SETUP.sql` in SQL Editor
- [ ] Configure Email Templates (Confirm signup + Reset password)
- [ ] Add Redirect URLs in Authentication settings
- [ ] Enable Email Confirm in Providers
- [ ] Test registration
- [ ] Test password reset

