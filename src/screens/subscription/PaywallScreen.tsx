// ===============================================
// PREMIUM PAYWALL SCREEN
// ===============================================
// High-conversion paywall with 7-day free trial
// RevenueCat integration for App Store compliance

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { usePurchases } from '../../contexts/PurchasesContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { colors } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

// Feature list for PRO
const PRO_FEATURES = [
  {
    icon: 'people' as const,
    title: 'Unlimited Clients',
    description: 'Add as many clients as you need',
  },
  {
    icon: 'calendar' as const,
    title: 'Unlimited Sessions',
    description: 'Schedule without any restrictions',
  },
  {
    icon: 'analytics' as const,
    title: 'Advanced Analytics',
    description: 'Revenue insights & attendance trends',
  },
  {
    icon: 'notifications' as const,
    title: 'Smart Reminders',
    description: 'Automatic payment notifications',
  },
  {
    icon: 'cloud-upload' as const,
    title: 'Cloud Backup',
    description: 'Your data synced & secure',
  },
];

export default function PaywallScreen({ navigation }: any) {
  const { t } = useLanguage();
  const {
    packages,
    loading,
    purchasePackage,
    restorePurchases,
    getMonthlyPackage,
    getAnnualPackage,
    isExpoGo,
    simulatePurchase,
  } = usePurchases();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [isRestoring, setIsRestoring] = useState(false);

  // Animation for the crown/badge
  const crownScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    // Pulsing crown animation
    crownScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );

    // Glow animation
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const crownAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: crownScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // Get packages
  const monthlyPkg = getMonthlyPackage();
  const annualPkg = getAnnualPackage();

  const handlePurchase = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const selectedPackage = selectedPlan === 'monthly' ? monthlyPkg : annualPkg;

    if (!selectedPackage) {
      console.error('No package selected');
      return;
    }

    const success = await purchasePackage(selectedPackage);

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRestoring(true);

    const success = await restorePurchases();

    if (success) {
      navigation.goBack();
    }

    setIsRestoring(false);
  };

  const openTerms = () => {
    Linking.openURL('https://hubertdomagalaa.github.io/fitnessguru-legal.pages/terms-of-service.html');
  };

  const openPrivacy = () => {
    Linking.openURL('https://hubertdomagalaa.github.io/fitnessguru-legal.pages/privacy-policy.html');
  };

  // Format price for display
  const getFormattedPrice = (plan: 'monthly' | 'annual') => {
    const pkg = plan === 'monthly' ? monthlyPkg : annualPkg;
    if (!pkg) return { price: '—', period: '' };

    return {
      price: pkg.product.priceString,
      period: plan === 'monthly' ? '/month' : '/year',
    };
  };

  const monthlyPrice = getFormattedPrice('monthly');
  const annualPrice = getFormattedPrice('annual');

  return (
    <View style={styles.container}>
      {/* Animated Background */}
      <LinearGradient
        colors={['#0A0A0A', '#0F172A', '#0A0A0A']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Orbs */}
      <Animated.View entering={FadeIn.duration(1500)} style={styles.orb1} />
      <Animated.View entering={FadeIn.duration(1500).delay(300)} style={styles.orb2} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Expo Go Banner */}
        {isExpoGo && (
          <Animated.View entering={FadeIn.duration(500)} style={styles.expoGoBanner}>
            <Ionicons name="information-circle" size={18} color="#FFD700" />
            <Text style={styles.expoGoBannerText}>
              Expo Go Mode - Tap "Simulate" to test
            </Text>
            <TouchableOpacity
              style={styles.simulateButton}
              onPress={() => {
                simulatePurchase();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                navigation.goBack();
              }}
            >
              <Text style={styles.simulateButtonText}>Simulate</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Crown Icon with Glow */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.iconContainer}>
          <Animated.View style={[styles.iconGlow, glowAnimatedStyle]} />
          <Animated.View style={crownAnimatedStyle}>
            <LinearGradient
              colors={['#FFD700', '#FFA500', '#FFD700']}
              style={styles.crownGradient}
            >
              <Ionicons name="trophy" size={40} color="#000" />
            </LinearGradient>
          </Animated.View>
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.titleContainer}>
          <Text style={styles.title}>Unlock PRO</Text>
          <Text style={styles.subtitle}>
            Take your fitness business to the next level
          </Text>
        </Animated.View>

        {/* Features List */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.featuresContainer}>
          {PRO_FEATURES.map((feature, index) => (
            <Animated.View
              key={feature.title}
              entering={FadeInDown.delay(350 + index * 50)}
              style={styles.featureRow}
            >
              <View style={styles.featureIconContainer}>
                <Ionicons name={feature.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            </Animated.View>
          ))}
        </Animated.View>

        {/* Pricing Cards */}
        <Animated.View
          entering={SlideInDown.delay(500).springify()}
          style={styles.pricingContainer}
        >
          {/* Monthly Plan */}
          <TouchableOpacity
            style={[
              styles.pricingCard,
              selectedPlan === 'monthly' && styles.pricingCardSelected,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedPlan('monthly');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.pricingCardHeader}>
              <Text style={styles.planName}>Monthly</Text>
              {selectedPlan === 'monthly' && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </View>

            {/* 7-DAY FREE TRIAL BADGE */}
            <View style={styles.trialBadge}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.trialBadgeGradient}
              >
                <Ionicons name="gift" size={14} color="#000" />
                <Text style={styles.trialBadgeText}>7-DAY FREE TRIAL</Text>
              </LinearGradient>
            </View>

            <Text style={styles.priceText}>{monthlyPrice.price}</Text>
            <Text style={styles.pricePeriod}>{monthlyPrice.period}</Text>
          </TouchableOpacity>

          {/* Annual Plan */}
          <TouchableOpacity
            style={[
              styles.pricingCard,
              selectedPlan === 'annual' && styles.pricingCardSelected,
              styles.pricingCardFeatured,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedPlan('annual');
            }}
            activeOpacity={0.8}
          >
            {/* Best Value Badge */}
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>SAVE 17%</Text>
            </View>

            <View style={styles.pricingCardHeader}>
              <Text style={styles.planName}>Annual</Text>
              {selectedPlan === 'annual' && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </View>

            <Text style={styles.priceText}>{annualPrice.price}</Text>
            <Text style={styles.pricePeriod}>{annualPrice.period}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* CTA Button */}
        <Animated.View entering={FadeInUp.delay(600)} style={styles.ctaContainer}>
          <TouchableOpacity
            style={[styles.ctaButton, loading && styles.ctaButtonDisabled]}
            onPress={handlePurchase}
            disabled={loading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#00FF88', '#00E67A', '#00CC6A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Text style={styles.ctaText}>
                    {selectedPlan === 'monthly'
                      ? 'Start 7-Day Free Trial'
                      : 'Subscribe Now'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#000" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {selectedPlan === 'monthly' && (
            <Text style={styles.trialInfo}>
              {monthlyPrice.price}/mo after trial. Cancel anytime.
            </Text>
          )}
        </Animated.View>

        {/* Restore Purchases */}
        <Animated.View entering={FadeIn.delay(700)} style={styles.restoreContainer}>
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isRestoring}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Text style={styles.restoreText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Terms & Privacy - REQUIRED FOR APP STORE */}
        <Animated.View entering={FadeIn.delay(800)} style={styles.legalContainer}>
          <Text style={styles.legalText}>
            By subscribing, you agree to our{' '}
            <Text style={styles.legalLink} onPress={openTerms}>
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text style={styles.legalLink} onPress={openPrivacy}>
              Privacy Policy
            </Text>
          </Text>
          <Text style={styles.legalSubtext}>
            Payment will be charged to your Apple ID account. Subscription
            automatically renews unless cancelled at least 24 hours before the
            end of the current period.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  expoGoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    marginHorizontal: 24,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    gap: 8,
  },
  expoGoBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#FFD700',
  },
  simulateButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  simulateButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    color: '#000',
  },
  orb1: {
    position: 'absolute',
    top: -50,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primary,
    opacity: 0.08,
  },
  orb2: {
    position: 'absolute',
    bottom: 100,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#FFD700',
    opacity: 0.06,
  },
  header: {
    padding: 16,
    paddingTop: 56,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFD700',
  },
  crownGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontFamily: 'Poppins-Bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: colors.textSecondary,
  },
  pricingContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  pricingCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    position: 'relative',
  },
  pricingCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  pricingCardFeatured: {
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  pricingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  planName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: colors.textPrimary,
  },
  trialBadge: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  trialBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  trialBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    color: '#000',
    letterSpacing: 0.5,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bestValueText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    color: '#000',
  },
  priceText: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: colors.primary,
  },
  pricePeriod: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: colors.textSecondary,
  },
  ctaContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  ctaText: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    color: '#000',
  },
  trialInfo: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  restoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  restoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  restoreText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  legalContainer: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  legalText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  legalSubtext: {
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
});

