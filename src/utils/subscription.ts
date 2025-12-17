// ===============================================
// SUBSCRIPTION UTILITIES
// ===============================================
// Feature gating and subscription access control

import { CustomerInfo } from 'react-native-purchases';
import { PRO_ENTITLEMENT_ID } from '../contexts/PurchasesContext';

// ============ TYPES ============
export interface SubscriptionUser {
  isPro: boolean;
  isTrialActive?: boolean;
  customerInfo?: CustomerInfo | null;
}

export type FeatureKey =
  | 'unlimited_clients'
  | 'unlimited_sessions'
  | 'advanced_analytics'
  | 'payment_tracking'
  | 'export_data'
  | 'smart_reminders'
  | 'cloud_backup'
  | 'priority_support';

// ============ FEATURE LIMITS (FREE TIER) ============
export const FREE_TIER_LIMITS = {
  MAX_CLIENTS: 5,
  MAX_SESSIONS_PER_MONTH: 20,
  ANALYTICS_DAYS: 7,
} as const;

// ============ ACCESS CONTROL ============

/**
 * Check if user has PRO access (paid or in trial)
 * @param user - User subscription state
 * @returns true if user is PRO or in Trial
 */
export const checkAccess = (user: SubscriptionUser | null | undefined): boolean => {
  if (!user) return false;
  return user.isPro || user.isTrialActive || false;
};

/**
 * Check if a specific feature is available
 * @param user - User subscription state  
 * @param feature - Feature key to check
 * @returns true if feature is available
 */
export const hasFeatureAccess = (
  user: SubscriptionUser | null | undefined,
  feature: FeatureKey
): boolean => {
  // PRO users have access to all features
  if (checkAccess(user)) {
    return true;
  }

  // Free tier feature access (limited)
  switch (feature) {
    case 'unlimited_clients':
    case 'unlimited_sessions':
    case 'advanced_analytics':
    case 'export_data':
    case 'smart_reminders':
    case 'priority_support':
      return false; // PRO only

    case 'payment_tracking':
    case 'cloud_backup':
      return true; // Available on free tier

    default:
      return false;
  }
};

/**
 * Check if user can add more clients (respects free tier limits)
 * @param user - User subscription state
 * @param currentClientCount - Current number of clients
 * @returns true if can add more clients
 */
export const canAddClient = (
  user: SubscriptionUser | null | undefined,
  currentClientCount: number
): boolean => {
  if (checkAccess(user)) {
    return true; // PRO has unlimited
  }
  return currentClientCount < FREE_TIER_LIMITS.MAX_CLIENTS;
};

/**
 * Check if user can create more sessions (respects free tier limits)
 * @param user - User subscription state
 * @param currentSessionsThisMonth - Sessions created this month
 * @returns true if can create more sessions
 */
export const canCreateSession = (
  user: SubscriptionUser | null | undefined,
  currentSessionsThisMonth: number
): boolean => {
  if (checkAccess(user)) {
    return true; // PRO has unlimited
  }
  return currentSessionsThisMonth < FREE_TIER_LIMITS.MAX_SESSIONS_PER_MONTH;
};

/**
 * Get remaining capacity for a feature
 * @param user - User subscription state
 * @param feature - Feature to check
 * @param currentUsage - Current usage count
 * @returns remaining capacity or Infinity for PRO users
 */
export const getRemainingCapacity = (
  user: SubscriptionUser | null | undefined,
  feature: 'clients' | 'sessions',
  currentUsage: number
): number => {
  if (checkAccess(user)) {
    return Infinity;
  }

  switch (feature) {
    case 'clients':
      return Math.max(0, FREE_TIER_LIMITS.MAX_CLIENTS - currentUsage);
    case 'sessions':
      return Math.max(0, FREE_TIER_LIMITS.MAX_SESSIONS_PER_MONTH - currentUsage);
    default:
      return 0;
  }
};

// ============ SUBSCRIPTION STATUS HELPERS ============

/**
 * Get human-readable subscription status
 * @param user - User subscription state
 * @returns Status string
 */
export const getSubscriptionStatus = (
  user: SubscriptionUser | null | undefined
): 'pro' | 'trial' | 'free' | 'expired' => {
  if (!user) return 'free';

  if (user.isPro && !user.isTrialActive) {
    return 'pro';
  }

  if (user.isTrialActive) {
    return 'trial';
  }

  return 'free';
};

/**
 * Get trial days remaining (if in trial)
 * @param customerInfo - RevenueCat customer info
 * @returns Days remaining or null if not in trial
 */
export const getTrialDaysRemaining = (
  customerInfo: CustomerInfo | null | undefined
): number | null => {
  if (!customerInfo) return null;

  const proEntitlement = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];
  if (!proEntitlement || proEntitlement.periodType !== 'TRIAL') {
    return null;
  }

  const expirationDate = proEntitlement.expirationDate;
  if (!expirationDate) return null;

  const now = new Date();
  const expiration = new Date(expirationDate);
  const diffTime = expiration.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
};

/**
 * Check if subscription is about to expire (within X days)
 * @param customerInfo - RevenueCat customer info
 * @param thresholdDays - Days threshold for "expiring soon"
 * @returns true if expiring within threshold
 */
export const isSubscriptionExpiringSoon = (
  customerInfo: CustomerInfo | null | undefined,
  thresholdDays: number = 3
): boolean => {
  if (!customerInfo) return false;

  const proEntitlement = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];
  if (!proEntitlement?.expirationDate) return false;

  const now = new Date();
  const expiration = new Date(proEntitlement.expirationDate);
  const diffTime = expiration.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 && diffDays <= thresholdDays;
};

// ============ UI HELPERS ============

/**
 * Get badge configuration for subscription status
 * @param user - User subscription state
 * @returns Badge config for UI
 */
export const getSubscriptionBadge = (
  user: SubscriptionUser | null | undefined
): { text: string; color: string; backgroundColor: string } => {
  const status = getSubscriptionStatus(user);

  switch (status) {
    case 'pro':
      return {
        text: 'PRO ✓',
        color: '#00FF88',
        backgroundColor: 'rgba(0, 255, 136, 0.15)',
      };
    case 'trial':
      return {
        text: 'TRIAL',
        color: '#FFD700',
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
      };
    case 'expired':
      return {
        text: 'EXPIRED',
        color: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
      };
    default:
      return {
        text: 'FREE',
        color: '#9CA3AF',
        backgroundColor: 'rgba(156, 163, 175, 0.15)',
      };
  }
};

