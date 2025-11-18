# 🏋️ FitnessGuru

**The ultimate app for fitness coaches and personal trainers.**

Track clients, manage attendance, process payments, and grow your fitness business.

---

## ✨ Features

- 👥 **Client Management** - Track all your clients in one place
- ✅ **Attendance Tracking** - Quick check-in for training sessions
- 💰 **Payment Tracking** - Monitor payments and overdue amounts
- 📅 **Calendar View** - Visualize your training schedule
- 📝 **Session Notes** - Add notes to each training session
- 📊 **Statistics** - Track your business growth
- ☁️ **Cloud Sync** - Access your data from any device

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm start
```

### Running on Device

1. Install Expo Go on your iOS or Android device
2. Scan the QR code from the terminal
3. The app will load on your device

---

## 🏗️ Building for Production

### Android (Google Play)

```bash
# Build AAB for Google Play
eas build --platform android --profile production
```

### iOS (App Store)

```bash
# Build IPA for App Store
eas build --platform ios --profile production
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
EXPO_PUBLIC_STRIPE_PRICE_MONTHLY=your_price_id
EXPO_PUBLIC_STRIPE_PRICE_YEARLY=your_price_id
STRIPE_SECRET_KEY=your_stripe_secret_key
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

Run the SQL migrations in `/database` folder in your Supabase SQL Editor.

---

## 📱 Tech Stack

- **Framework:** React Native + Expo
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Payments:** Stripe
- **State Management:** React Context API
- **Navigation:** React Navigation
- **UI:** Custom components with React Native

---

## 📖 Documentation

Complete documentation is available in the `/docs` folder:
- Deployment guides
- Feature documentation
- Legal documents
- Analysis and business plans

---

## 🎯 Free Trial

New users get a 30-day free trial with all premium features.

---

## 💳 Subscription Plans

- **Monthly:** 39 zł/month
- **Yearly:** 390 zł/year (save 20%)

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Support

For support, email: support@fitnessguru.app

---

**Made with ❤️ for fitness coaches**

