import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface TrialInfo {
  status: string;
  is_active: boolean;
  days_left: number;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
}

export function useTrialStatus() {
  const { user } = useAuth();
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkTrialStatus();
    }
  }, [user]);

  const checkTrialStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_trial_info', { p_coach_id: user.id });

      if (error) throw error;

      if (data && data.length > 0) {
        setTrialInfo(data[0]);
      }
    } catch (error) {
      console.error('Error checking trial status:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    checkTrialStatus();
  };

  return {
    trialInfo,
    loading,
    isActive: trialInfo?.is_active ?? false,
    daysLeft: trialInfo?.days_left ?? 0,
    status: trialInfo?.status ?? 'trial',
    refresh,
  };
}

