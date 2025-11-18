import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

type Language = 'en' | 'pl';

interface Translations {
  [key: string]: {
    en: string;
    pl: string;
  };
}

const translations: Translations = {
  // Welcome Screen
  'welcome.title': {
    en: 'FitnessGuru',
    pl: 'FitnessGuru',
  },
  'welcome.subtitle': {
    en: 'The modern attendance and client management app built for fitness instructors, personal trainers, and coaches who want to focus on training, not admin work.',
    pl: 'Nowoczesna aplikacja do zarządzania frekwencją i klientami stworzona dla instruktorów fitness, trenerów personalnych i trenerów, którzy chcą skupić się na treningu, a nie na pracy administracyjnej.',
  },
  'welcome.sessionManagement': {
    en: 'Session Management',
    pl: 'Zarządzanie Sesjami',
  },
  'welcome.sessionManagementDesc': {
    en: 'Schedule and manage all your training sessions in one place',
    pl: 'Planuj i zarządzaj wszystkimi sesjami treningowymi w jednym miejscu',
  },
  'welcome.clientTracking': {
    en: 'Client Tracking',
    pl: 'Śledzenie Klientów',
  },
  'welcome.clientTrackingDesc': {
    en: 'Monitor attendance, progress, and membership details',
    pl: 'Monitoruj frekwencję, postępy i szczegóły członkostwa',
  },
  'welcome.analytics': {
    en: 'Analytics & Insights',
    pl: 'Analityka i Statystyki',
  },
  'welcome.analyticsDesc': {
    en: 'Track performance metrics and grow your business',
    pl: 'Śledź metryki wydajności i rozwijaj swój biznes',
  },
  'welcome.paymentTracking': {
    en: 'Payment Tracking',
    pl: 'Śledzenie Płatności',
  },
  'welcome.paymentTrackingDesc': {
    en: 'Never miss a payment with automated reminders',
    pl: 'Nigdy nie przegap płatności dzięki automatycznym przypomnieniom',
  },
  'welcome.getStarted': {
    en: 'Get Started',
    pl: 'Rozpocznij',
  },
  'welcome.footer': {
    en: 'Free to use • No credit card required',
    pl: 'Darmowe • Nie wymaga karty kredytowej',
  },
  // Login Screen
  'login.welcomeBack': {
    en: 'Welcome Back',
    pl: 'Witaj Ponownie',
  },
  'login.createAccount': {
    en: 'Create Account',
    pl: 'Utwórz Konto',
  },
  'login.signInTo': {
    en: 'Sign in to continue to FitnessGuru',
    pl: 'Zaloguj się, aby kontynuować do FitnessGuru',
  },
  'login.startManaging': {
    en: 'Start managing your clients today',
    pl: 'Zacznij zarządzać swoimi klientami już dziś',
  },
  'login.fullName': {
    en: 'Full Name',
    pl: 'Imię i Nazwisko',
  },
  'login.email': {
    en: 'Email Address',
    pl: 'Adres Email',
  },
  'login.password': {
    en: 'Password',
    pl: 'Hasło',
  },
  'login.forgotPassword': {
    en: 'Forgot password?',
    pl: 'Zapomniałeś hasła?',
  },
  'login.signIn': {
    en: 'Sign In',
    pl: 'Zaloguj się',
  },
  'login.noAccount': {
    en: "Don't have an account?",
    pl: 'Nie masz konta?',
  },
  'login.hasAccount': {
    en: 'Already have an account?',
    pl: 'Masz już konto?',
  },
  'login.signUp': {
    en: 'Sign up',
    pl: 'Zarejestruj się',
  },
  'login.terms': {
    en: "By continuing, you agree to FitnessGuru's Terms of Service and Privacy Policy",
    pl: 'Kontynuując, akceptujesz Warunki Świadczenia Usług i Politykę Prywatności FitnessGuru',
  },
  'login.back': {
    en: 'Back',
    pl: 'Wstecz',
  },
  // Calendar Screen
  'calendar.title': {
    en: 'FitnessGuru',
    pl: 'FitnessGuru',
  },
  'calendar.subtitle': {
    en: 'Manage your sessions',
    pl: 'Zarządzaj swoimi sesjami',
  },
  'calendar.todaySessions': {
    en: "Today's Sessions",
    pl: 'Dzisiejsze Sesje',
  },
  'calendar.noSessions': {
    en: 'No sessions scheduled for today',
    pl: 'Brak sesji zaplanowanych na dziś',
  },
  'calendar.createSession': {
    en: 'Create Session',
    pl: 'Utwórz Sesję',
  },
  'calendar.swipeHint': {
    en: 'Swipe to change months',
    pl: 'Przesuń, aby zmienić miesiące',
  },
  // Profile Screen
  'profile.title': {
    en: 'Profile',
    pl: 'Profil',
  },
  'profile.subtitle': {
    en: 'Manage your account',
    pl: 'Zarządzaj swoim kontem',
  },
  'profile.sessions': {
    en: 'Sessions',
    pl: 'Sesje',
  },
  'profile.clients': {
    en: 'Clients',
    pl: 'Klienci',
  },
  'profile.subscription': {
    en: 'Subscription',
    pl: 'Subskrypcja',
  },
  'profile.freePlan': {
    en: 'Free Plan',
    pl: 'Plan Darmowy',
  },
  'profile.upgradeDesc': {
    en: 'Upgrade to Professional for unlimited clients and advanced features!',
    pl: 'Przejdź na Plan Profesjonalny dla nieograniczonej liczby klientów i zaawansowanych funkcji!',
  },
  'profile.upgradeToPro': {
    en: 'Upgrade to Pro',
    pl: 'Przejdź na Pro',
  },
  'profile.privacySecurity': {
    en: 'Privacy & Security',
    pl: 'Prywatność i Bezpieczeństwo',
  },
  'profile.privacyDesc': {
    en: 'Your data protection & security info',
    pl: 'Ochrona danych i informacje o bezpieczeństwie',
  },
  'profile.logout': {
    en: 'Log Out',
    pl: 'Wyloguj się',
  },
  'profile.appInfo': {
    en: 'FitnessGuru v1.0.0',
    pl: 'FitnessGuru v1.0.0',
  },
  'profile.madeFor': {
    en: 'Made for coaches, by coaches',
    pl: 'Stworzone dla trenerów, przez trenerów',
  },
  // Privacy Modal
  'privacy.title': {
    en: 'Privacy & Security',
    pl: 'Prywatność i Bezpieczeństwo',
  },
  'privacy.dataProtected': {
    en: '🔒 Your Data is Protected',
    pl: '🔒 Twoje Dane są Chronione',
  },
  'privacy.secureStorage': {
    en: 'All data stored securely in the cloud',
    pl: 'Wszystkie dane przechowywane bezpiecznie w chmurze',
  },
  'privacy.rlsEnabled': {
    en: 'Advanced security protocols enabled',
    pl: 'Włączone zaawansowane protokoły bezpieczeństwa',
  },
  'privacy.accessControl': {
    en: 'Only you can access your data',
    pl: 'Tylko Ty masz dostęp do swoich danych',
  },
  'privacy.encryption': {
    en: 'Encrypted connections (HTTPS)',
    pl: 'Szyfrowane połączenia (HTTPS)',
  },
  'privacy.noSharing': {
    en: 'No data sharing with third parties',
    pl: 'Brak udostępniania danych stronom trzecim',
  },
  'privacy.clientsPrivate': {
    en: "Your clients' information is private",
    pl: 'Informacje o Twoich klientach są prywatne',
  },
  'privacy.paymentsConfidential': {
    en: 'Payment records are confidential',
    pl: 'Zapisy płatności są poufne',
  },
  'privacy.dbSecurity': {
    en: 'Database Security:',
    pl: 'Bezpieczeństwo Bazy Danych:',
  },
  'privacy.coachIsolation': {
    en: 'Each coach can only see their own clients',
    pl: 'Każdy trener widzi tylko swoich klientów',
  },
  'privacy.sessionIsolation': {
    en: 'Sessions are isolated per coach',
    pl: 'Sesje są odizolowane dla każdego trenera',
  },
  'privacy.paymentProtection': {
    en: 'Payment data is encrypted and protected',
    pl: 'Dane płatności są szyfrowane i chronione',
  },
  'privacy.authRequired': {
    en: 'Authentication required for all actions',
    pl: 'Uwierzytelnianie wymagane dla wszystkich działań',
  },
  'privacy.priority': {
    en: 'Your privacy is our priority!',
    pl: 'Twoja prywatność jest naszym priorytetem!',
  },
  'privacy.gotIt': {
    en: 'Got it',
    pl: 'Rozumiem',
  },
  // Common
  'common.ok': {
    en: 'OK',
    pl: 'OK',
  },
  'common.cancel': {
    en: 'Cancel',
    pl: 'Anuluj',
  },
  'common.save': {
    en: 'Save',
    pl: 'Zapisz',
  },
  'common.delete': {
    en: 'Delete',
    pl: 'Usuń',
  },
  'common.edit': {
    en: 'Edit',
    pl: 'Edytuj',
  },
  'common.close': {
    en: 'Close',
    pl: 'Zamknij',
  },
  // Subscription Screen
  'subscription.title': {
    en: 'Upgrade to PRO',
    pl: 'Przejdź na PRO',
  },
  'subscription.subtitle': {
    en: 'Unlock unlimited features and grow your fitness business',
    pl: 'Odblokuj nieograniczone funkcje i rozwijaj swój biznes fitness',
  },
  'subscription.monthly': {
    en: 'Monthly',
    pl: 'Miesięczny',
  },
  'subscription.annual': {
    en: 'Annual',
    pl: 'Roczny',
  },
  'subscription.month': {
    en: 'month',
    pl: 'miesiąc',
  },
  'subscription.year': {
    en: 'year',
    pl: 'rok',
  },
  'subscription.flexible': {
    en: 'Flexible',
    pl: 'Elastyczny',
  },
  'subscription.bestValue': {
    en: 'BEST VALUE',
    pl: 'NAJLEPSZA OFERTA',
  },
  'subscription.save78': {
    en: 'Save 78 zł (2 months free!)',
    pl: 'Oszczędź 78 zł (2 miesiące gratis!)',
  },
  'subscription.subscribeMonthly': {
    en: 'Subscribe Monthly',
    pl: 'Subskrybuj miesięcznie',
  },
  'subscription.subscribeYearly': {
    en: 'Subscribe Yearly',
    pl: 'Subskrybuj rocznie',
  },
  'subscription.included': {
    en: "What's Included",
    pl: 'Co zawiera',
  },
  'subscription.unlimitedClients': {
    en: 'Unlimited clients',
    pl: 'Nieograniczona liczba klientów',
  },
  'subscription.analytics': {
    en: 'Advanced analytics & stats',
    pl: 'Zaawansowana analityka i statystyki',
  },
  'subscription.paymentTracking': {
    en: 'Payment tracking',
    pl: 'Śledzenie płatności',
  },
  'subscription.customColors': {
    en: 'Custom session colors',
    pl: 'Własne kolory sesji',
  },
  'subscription.prioritySupport': {
    en: 'Priority support',
    pl: 'Priorytetowe wsparcie',
  },
  'subscription.exportData': {
    en: 'Export data',
    pl: 'Eksport danych',
  },
  'subscription.paymentMethods': {
    en: 'Accepted Payment Methods',
    pl: 'Akceptowane metody płatności',
  },
  'subscription.card': {
    en: 'Card',
    pl: 'Karta',
  },
  'subscription.footer': {
    en: 'Secure payment powered by Stripe. Cancel anytime.',
    pl: 'Bezpieczna płatność przez Stripe. Anuluj w dowolnym momencie.',
  },
  'subscription.success': {
    en: 'Success!',
    pl: 'Sukces!',
  },
  'subscription.successMessage': {
    en: 'Your subscription is now active!',
    pl: 'Twoja subskrypcja jest aktywna!',
  },
  'subscription.error': {
    en: 'Payment Failed',
    pl: 'Płatność nieudana',
  },
  'subscription.errorMessage': {
    en: 'Please try again',
    pl: 'Spróbuj ponownie',
  },
  // Trial Banner
  'trial.endingSoon': {
    en: 'Trial ending soon',
    pl: 'Okres próbny wkrótce się kończy',
  },
  'trial.daysLeft': {
    en: 'days left',
    pl: 'dni pozostało',
  },
  'trial.tapToUpgrade': {
    en: 'Tap to upgrade to PRO',
    pl: 'Dotknij, aby przejść na PRO',
  },
  'trial.expired': {
    en: 'Trial expired',
    pl: 'Okres próbny wygasł',
  },
  'trial.subscribeNow': {
    en: 'Subscribe to continue using all features',
    pl: 'Subskrybuj, aby kontynuować korzystanie ze wszystkich funkcji',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem('language');
      if (saved === 'en' || saved === 'pl') {
        setLanguageState(saved);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem('language', lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

