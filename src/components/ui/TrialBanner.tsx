import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';

interface TrialBannerProps {
  navigation: any;
}

interface TrialInfo {
  status: string;
  is_active: boolean;
  days_left: number;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
}

export default function TrialBanner({ navigation }: TrialBannerProps) {
  const { user } = useAuth();
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTrialInfo();
    }
  }, [user]);

  const fetchTrialInfo = async () => {
    if (!user) {
      console.log('❌ TrialBanner: No user');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 TrialBanner: Fetching trial info for user:', user.id);
      
      // Use RPC function to get trial info with user ID parameter
      const { data, error } = await supabase.rpc('get_trial_info', {
        p_coach_id: user.id
      });

      console.log('📊 TrialBanner: Response:', { data, error });

      if (error) {
        console.error('❌ TrialBanner: Error fetching trial info:', error);
        // If RPC doesn't exist yet, fail silently
        setLoading(false);
        return;
      }

      if (data) {
        console.log('✅ TrialBanner: Trial info received:', data);
        setTrialInfo(data);
      } else {
        console.log('⚠️ TrialBanner: No data returned');
      }
    } catch (error) {
      console.error('❌ TrialBanner: Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !trialInfo) {
    console.log('🚫 TrialBanner: Not rendering (loading or no data)', { loading, hasTrialInfo: !!trialInfo });
    return null;
  }

  console.log('🎯 TrialBanner: Checking display logic:', trialInfo);

  // Don't show banner if subscription is active
  if (trialInfo.status === 'active') {
    console.log('✅ TrialBanner: Subscription active, hiding banner');
    return null;
  }

  // Show warning banner if trial ending soon (7 days or less)
  if (trialInfo.status === 'trial' && trialInfo.days_left <= 7 && trialInfo.days_left > 0) {
    console.log('⚠️ TrialBanner: Showing WARNING banner (days left:', trialInfo.days_left, ')');

    return (
      <TouchableOpacity
        style={[styles.banner, styles.bannerWarning]}
        onPress={() => navigation.navigate('Subscription')}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="time-outline" size={20} color={colors.warning} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Trial ending soon</Text>
          <Text style={styles.subtitle}>
            {trialInfo.days_left} {trialInfo.days_left === 1 ? 'day' : 'days'} left - Upgrade now
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  // Show danger banner if trial expired
  if (trialInfo.status === 'trial' && trialInfo.days_left <= 0) {
    console.log('🔴 TrialBanner: Showing EXPIRED banner');
    return (
      <TouchableOpacity
        style={[styles.banner, styles.bannerDanger]}
        onPress={() => navigation.navigate('Subscription')}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.destructive} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Trial Expired</Text>
          <Text style={styles.subtitle}>
            Upgrade to continue using FitnessGuru
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  console.log('🤷 TrialBanner: No condition matched, hiding banner. TrialInfo:', trialInfo);
  return null;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
  },
  bannerWarning: {
    backgroundColor: `${colors.warning}15`,
    borderColor: `${colors.warning}30`,
  },
  bannerDanger: {
    backgroundColor: `${colors.destructive}15`,
    borderColor: `${colors.destructive}30`,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
