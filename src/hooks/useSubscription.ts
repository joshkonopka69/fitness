import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface SubscriptionStatus {
  isActive: boolean;
  daysLeft: number;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  isTrial: boolean;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    isActive: true, // Default to active while loading
    daysLeft: 30,
    status: 'trial',
    isTrial: true,
    trialEndsAt: null,
    subscriptionEndsAt: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user]);

  const checkSubscription = async () => {
    if (!user) return;

    try {
      // Call the database function to check status
      const { data, error } = await supabase
        .rpc('check_subscription_status', { coach_id_param: user.id });

      if (error) throw error;

      if (data && data.length > 0) {
        const status = data[0];
        setSubscription({
          isActive: status.is_active,
          daysLeft: status.days_left || 0,
          status: status.status,
          isTrial: status.status === 'trial',
          trialEndsAt: null, // Can fetch from coach_profiles if needed
          subscriptionEndsAt: null,
        });
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      // Default to active on error (fail-open during beta)
      setSubscription({
        isActive: true,
        daysLeft: 30,
        status: 'trial',
        isTrial: true,
        trialEndsAt: null,
        subscriptionEndsAt: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const canCreateSession = () => {
    // Allow if active subscription or in trial
    return subscription.isActive;
  };

  const canAddClient = () => {
    // Allow if active subscription or in trial
    return subscription.isActive;
  };

  const needsUpgrade = () => {
    return !subscription.isActive && subscription.status === 'expired';
  };

  return {
    ...subscription,
    loading,
    canCreateSession: canCreateSession(),
    canAddClient: canAddClient(),
    needsUpgrade: needsUpgrade(),
    refreshSubscription: checkSubscription,
  };
};

