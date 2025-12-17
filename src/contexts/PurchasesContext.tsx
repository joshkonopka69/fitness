// ===============================================
// REVENUECAT PURCHASES CONTEXT
// ===============================================
// Production-ready subscription management with RevenueCat
// Handles: initialization, purchases, restoration, entitlements
// Supports Expo Go (mock mode) and Development Builds (real IAP)

import Constants from 'expo-constants';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL,
  PurchasesError,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { useAuth } from './AuthContext';

// ============ CONFIGURATION ============
// Replace with your actual RevenueCat API keys from dashboard
// Get these from: https://app.revenuecat.com → Your App → API Keys
const REVENUECAT_API_KEY_IOS = 'appl_YOUR_IOS_API_KEY_HERE';
const REVENUECAT_API_KEY_ANDROID = 'goog_YOUR_ANDROID_API_KEY_HERE';

// Entitlement ID from RevenueCat dashboard
const PRO_ENTITLEMENT_ID = 'pro';

// ============ EXPO GO DETECTION ============
// RevenueCat native IAP does NOT work in Expo Go - it requires a development build
const isExpoGo = Constants.appOwnership === 'expo';

// ============ TYPES ============
interface PurchasesContextType {
  // State
  isPro: boolean;
  isTrialActive: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  packages: PurchasesPackage[];
  loading: boolean;
  initialized: boolean;
  isExpoGo: boolean;

  // Actions
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshCustomerInfo: () => Promise<void>;

  // Helpers
  getMonthlyPackage: () => PurchasesPackage | undefined;
  getAnnualPackage: () => PurchasesPackage | undefined;

  // Dev helpers (for testing in Expo Go)
  simulatePurchase: () => void;
  simulateExpire: () => void;
}

const PurchasesContext = createContext<PurchasesContextType | undefined>(undefined);

// ============ MOCK DATA FOR EXPO GO ============
const createMockPackage = (id: string, price: string, period: string): any => ({
  identifier: id,
  packageType: id.includes('monthly') ? 'MONTHLY' : 'ANNUAL',
  product: {
    identifier: `com.hubertdomagalaa.fitnessguru.${id}`,
    priceString: price,
    price: parseFloat(price.replace(/[^0-9.]/g, '')),
    currencyCode: 'PLN',
    title: id.includes('monthly') ? 'PRO Monthly' : 'PRO Annual',
    description: 'Unlock all features',
  },
  offeringIdentifier: 'default',
});

// ============ PROVIDER ============
export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // State
  const [isPro, setIsPro] = useState(false);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // ============ INITIALIZATION ============
  useEffect(() => {
    if (isExpoGo) {
      // Running in Expo Go - use mock mode
      console.log('📱 Running in Expo Go - RevenueCat using MOCK MODE');
      console.log('ℹ️  To test real purchases, create a development build:');
      console.log('    npx expo prebuild');
      console.log('    npx expo run:ios');
      initializeMockMode();
    } else {
      // Running in development/production build - use real RevenueCat
      initializePurchases();
    }
  }, []);

  // Re-identify user when auth changes (only for real builds)
  useEffect(() => {
    if (!isExpoGo && initialized && user?.id) {
      identifyUser(user.id);
    }
  }, [user?.id, initialized]);

  // ============ MOCK MODE (Expo Go) ============
  const initializeMockMode = () => {
    // Set up mock packages for UI testing
    const mockPackages = [
      createMockPackage('monthly', '19.99 zł', 'month'),
      createMockPackage('annual', '199.99 zł', 'year'),
    ];
    
    setPackages(mockPackages as any);
    setCurrentOffering({
      identifier: 'default',
      availablePackages: mockPackages,
    } as any);
    
    setInitialized(true);
    console.log('✅ Mock mode initialized with test packages');
  };

  // ============ REAL REVENUECAT (Development Build) ============
  const initializePurchases = async () => {
    try {
      // Enable debug logs in development
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      // Configure RevenueCat with platform-specific API key
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

      // Check if API key is set
      if (apiKey.includes('YOUR_') || apiKey.length < 10) {
        console.warn('⚠️ RevenueCat API key not configured. Using mock mode.');
        initializeMockMode();
        return;
      }

      await Purchases.configure({
        apiKey,
        appUserID: null, // Let RevenueCat generate anonymous ID initially
      });

      console.log('✅ RevenueCat initialized successfully');
      setInitialized(true);

      // Fetch initial data
      await Promise.all([
        fetchCustomerInfo(),
        fetchOfferings(),
      ]);

      // Listen for customer info updates
      Purchases.addCustomerInfoUpdateListener((info) => {
        console.log('📱 Customer info updated:', info.entitlements.active);
        updateSubscriptionStatus(info);
      });

    } catch (error) {
      console.error('❌ RevenueCat initialization failed:', error);
      // Fall back to mock mode if initialization fails
      console.log('🔄 Falling back to mock mode');
      initializeMockMode();
    }
  };

  const identifyUser = async (userId: string) => {
    if (isExpoGo) return; // Skip in Expo Go
    
    try {
      const { customerInfo } = await Purchases.logIn(userId);
      console.log('👤 User identified with RevenueCat:', userId);
      updateSubscriptionStatus(customerInfo);
    } catch (error) {
      console.error('Error identifying user:', error);
    }
  };

  // ============ FETCH DATA ============
  const fetchCustomerInfo = async () => {
    if (isExpoGo) return; // Skip in Expo Go
    
    try {
      const info = await Purchases.getCustomerInfo();
      updateSubscriptionStatus(info);
    } catch (error) {
      console.error('Error fetching customer info:', error);
    }
  };

  const fetchOfferings = async () => {
    if (isExpoGo) return; // Skip in Expo Go
    
    try {
      const offerings = await Purchases.getOfferings();

      if (offerings.current) {
        setCurrentOffering(offerings.current);
        setPackages(offerings.current.availablePackages);
        console.log('📦 Offerings loaded:', offerings.current.identifier);
        console.log('📦 Packages:', offerings.current.availablePackages.map(p => p.identifier));
      } else {
        console.warn('⚠️ No current offering available');
      }
    } catch (error) {
      console.error('Error fetching offerings:', error);
    }
  };

  // ============ STATUS UPDATES ============
  const updateSubscriptionStatus = (info: CustomerInfo) => {
    setCustomerInfo(info);

    // Check if user has PRO entitlement
    const proEntitlement = info.entitlements.active[PRO_ENTITLEMENT_ID];
    const hasProAccess = !!proEntitlement;

    setIsPro(hasProAccess);

    // Check if currently in trial period
    if (proEntitlement) {
      const periodType = proEntitlement.periodType;
      setIsTrialActive(periodType === 'TRIAL');
    } else {
      setIsTrialActive(false);
    }

    console.log('🔐 Subscription status:', { isPro: hasProAccess, isTrialActive: proEntitlement?.periodType === 'TRIAL' });
  };

  const refreshCustomerInfo = useCallback(async () => {
    if (!isExpoGo) {
      await fetchCustomerInfo();
    }
  }, []);

  // ============ PURCHASE ACTIONS ============
  const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
    // Handle Expo Go - show info alert
    if (isExpoGo) {
      Alert.alert(
        'Expo Go Mode',
        'Real purchases are not available in Expo Go.\n\nTo test real In-App Purchases:\n\n1. Run: npx expo prebuild\n2. Run: npx expo run:ios\n\nOr tap "Simulate Purchase" to test the UI flow.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Simulate Purchase', 
            onPress: () => simulatePurchase(),
          },
        ]
      );
      return false;
    }

    setLoading(true);

    try {
      console.log('💳 Starting purchase for:', pkg.identifier);

      const { customerInfo } = await Purchases.purchasePackage(pkg);

      updateSubscriptionStatus(customerInfo);

      // Check if purchase was successful
      if (customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]) {
        console.log('✅ Purchase successful!');
        return true;
      }

      return false;

    } catch (error) {
      const purchaseError = error as PurchasesError;

      // Don't show error for user cancellation - this is expected behavior
      if (purchaseError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        console.log('ℹ️ User cancelled purchase');
        return false;
      }

      // Handle other errors
      console.error('❌ Purchase error:', purchaseError.message);

      // Show user-friendly error message
      const errorMessage = getPurchaseErrorMessage(purchaseError.code);
      Alert.alert('Purchase Failed', errorMessage);

      return false;

    } finally {
      setLoading(false);
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    // Handle Expo Go
    if (isExpoGo) {
      Alert.alert(
        'Expo Go Mode',
        'Restore purchases is not available in Expo Go. Please use a development build to test real purchases.',
        [{ text: 'OK' }]
      );
      return false;
    }

    setLoading(true);

    try {
      console.log('🔄 Restoring purchases...');

      const customerInfo = await Purchases.restorePurchases();
      updateSubscriptionStatus(customerInfo);

      // Check if any purchases were restored
      if (customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]) {
        console.log('✅ Purchases restored successfully!');
        Alert.alert('Success', 'Your purchases have been restored!');
        return true;
      }

      Alert.alert(
        'No Purchases Found',
        'We couldn\'t find any previous purchases to restore. If you believe this is an error, please contact support.'
      );
      return false;

    } catch (error) {
      const purchaseError = error as PurchasesError;
      console.error('❌ Restore error:', purchaseError.message);

      Alert.alert('Restore Failed', 'Unable to restore purchases. Please try again later.');
      return false;

    } finally {
      setLoading(false);
    }
  };

  // ============ DEV HELPERS (Expo Go Testing) ============
  const simulatePurchase = () => {
    console.log('🧪 Simulating purchase (dev mode)');
    setIsPro(true);
    setIsTrialActive(true);
    Alert.alert('✅ Simulated!', 'PRO access granted (dev mode only).\n\nThis will reset when you reload the app.');
  };

  const simulateExpire = () => {
    console.log('🧪 Simulating expiration (dev mode)');
    setIsPro(false);
    setIsTrialActive(false);
    Alert.alert('Expired', 'PRO access removed (dev mode)');
  };

  // ============ HELPERS ============
  const getMonthlyPackage = (): PurchasesPackage | undefined => {
    return packages.find(
      (pkg) =>
        pkg.identifier === '$rc_monthly' ||
        pkg.identifier === 'monthly' ||
        pkg.packageType === 'MONTHLY'
    );
  };

  const getAnnualPackage = (): PurchasesPackage | undefined => {
    return packages.find(
      (pkg) =>
        pkg.identifier === '$rc_annual' ||
        pkg.identifier === 'annual' ||
        pkg.identifier === 'yearly' ||
        pkg.packageType === 'ANNUAL'
    );
  };

  // ============ ERROR MESSAGES ============
  const getPurchaseErrorMessage = (code: PURCHASES_ERROR_CODE): string => {
    switch (code) {
      case PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR:
        return 'This subscription is already associated with another account.';
      case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
        return 'Your payment is pending. Please complete the payment to activate your subscription.';
      case PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
        return 'This subscription is not available for purchase at the moment.';
      case PURCHASES_ERROR_CODE.NETWORK_ERROR:
        return 'Network error. Please check your connection and try again.';
      case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
        return 'There was a problem with the App Store. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  // ============ CONTEXT VALUE ============
  const value: PurchasesContextType = {
    // State
    isPro,
    isTrialActive,
    customerInfo,
    currentOffering,
    packages,
    loading,
    initialized,
    isExpoGo,

    // Actions
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo,

    // Helpers
    getMonthlyPackage,
    getAnnualPackage,

    // Dev helpers
    simulatePurchase,
    simulateExpire,
  };

  return (
    <PurchasesContext.Provider value={value}>
      {children}
    </PurchasesContext.Provider>
  );
}

// ============ HOOK ============
export function usePurchases() {
  const context = useContext(PurchasesContext);
  if (context === undefined) {
    throw new Error('usePurchases must be used within a PurchasesProvider');
  }
  return context;
}

// ============ EXPORTS ============
export { PRO_ENTITLEMENT_ID, isExpoGo };
