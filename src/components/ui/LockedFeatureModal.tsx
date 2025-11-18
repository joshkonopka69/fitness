import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { colors } from '../../theme/colors';

interface LockedFeatureModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  featureName?: string;
}

export default function LockedFeatureModal({
  visible,
  onClose,
  onUpgrade,
  featureName = 'This feature',
}: LockedFeatureModalProps) {
  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUpgrade();
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
          {/* Lock Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed" size={48} color={colors.destructive} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Trial Expired</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            {featureName} requires an active subscription
          </Text>

          {/* Description */}
          <Text style={styles.description}>
            Your 30-day free trial has ended. Upgrade to PRO to continue using all
            features and grow your fitness business.
          </Text>

          {/* Pricing */}
          <View style={styles.pricingCard}>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Monthly Plan</Text>
              <Text style={styles.pricingValue}>39 zł/month</Text>
            </View>
            <View style={[styles.pricingRow, { marginTop: 8 }]}>
              <Text style={styles.pricingLabel}>Annual Plan</Text>
              <View style={styles.pricingValueContainer}>
                <Text style={styles.pricingValue}>390 zł/year</Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveText}>Save 78 zł</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={handleUpgrade}
            activeOpacity={0.9}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to PRO</Text>
            <Ionicons name="arrow-forward" size={20} color="#1A1A1A" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
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
    borderColor: `${colors.destructive}30`,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.destructive}20`,
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
    marginBottom: 16,
    fontFamily: 'Poppins-Medium',
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  pricingCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  pricingValue: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: colors.textPrimary,
  },
  pricingValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBadge: {
    backgroundColor: `${colors.success}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  saveText: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
    color: colors.success,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#1A1A1A',
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

