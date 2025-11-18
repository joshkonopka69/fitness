import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';

interface TrialWelcomeModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function TrialWelcomeModal({ visible, onClose }: TrialWelcomeModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [daysRemaining, setDaysRemaining] = useState(30);

  useEffect(() => {
    if (visible && user) {
      fetchTrialInfo();
    }
  }, [visible, user]);

  const fetchTrialInfo = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_trial_info', { p_coach_id: user.id });

      if (error) throw error;

      if (data && data.length > 0) {
        setDaysRemaining(data[0].days_left || 30);
      }
    } catch (error) {
      console.error('Error fetching trial info:', error);
    }
  };

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          entering={FadeInDown.springify().delay(100)} 
          exiting={FadeOut}
          style={styles.container}
        >
          {/* Header Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="gift" size={48} color={colors.primary} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Welcome to FitnessGuru!</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Your 30-day free trial has started
          </Text>

          {/* Trial Info Card */}
          <View style={styles.trialCard}>
            <View style={styles.trialIconContainer}>
              <Ionicons name="time-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.trialTextContainer}>
              <Text style={styles.trialDays}>{daysRemaining} Days Free</Text>
              <Text style={styles.trialDescription}>
                Full access to all premium features
              </Text>
            </View>
          </View>

          {/* Features List */}
          <View style={styles.featuresList}>
            <FeatureItem 
              icon="calendar" 
              text="Unlimited sessions & scheduling"
            />
            <FeatureItem 
              icon="people" 
              text="Unlimited clients"
            />
            <FeatureItem 
              icon="stats-chart" 
              text="Advanced analytics & reports"
            />
            <FeatureItem 
              icon="cash" 
              text="Payment tracking & reminders"
            />
          </View>

          {/* Info Text */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              No credit card required. After 30 days, upgrade for only 39 zł/month
            </Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleGetStarted}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="#1A1A1A" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconContainer}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  trialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  trialIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trialTextContainer: {
    flex: 1,
  },
  trialDays: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: colors.primary,
    marginBottom: 2,
  },
  trialDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  featuresList: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: 'Poppins-Medium',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#1A1A1A',
  },
});

