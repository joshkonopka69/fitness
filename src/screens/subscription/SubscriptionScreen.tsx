import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import SuccessModal from '../../components/ui/SuccessModal';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';

export default function SubscriptionScreen({ navigation }: any) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to subscribe');
      return;
    }

    setLoading(true);

    try {
      // 1. Create payment intent on backend
      const priceId = plan === 'monthly' 
        ? process.env.EXPO_PUBLIC_STRIPE_PRICE_MONTHLY 
        : process.env.EXPO_PUBLIC_STRIPE_PRICE_YEARLY;

      console.log('Starting payment flow:', { plan, priceId, coachId: user.id, email: user.email });

      const { data, error: funcError } = await supabase.functions.invoke(
        'create-payment-intent',
        {
          body: {
            coachId: user.id,
            priceId: priceId,
            email: user.email,
            plan: plan,
          },
        }
      );

      console.log('Edge function response:', { data, error: funcError });

      if (funcError) {
        console.error('Edge function error:', funcError);
        throw new Error(`Backend error: ${funcError.message || 'Unknown error'}`);
      }

      if (!data || !data.clientSecret) {
        console.error('Invalid response from edge function:', data);
        throw new Error('Invalid payment setup response');
      }

      // 2. Initialize Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'FitnessGuru',
        customerId: data.customerId,
        customerEphemeralKeySecret: data.ephemeralKey.secret,
        paymentIntentClientSecret: data.clientSecret,
        allowsDelayedPaymentMethods: true,
        // Apple Pay configuration
        applePay: {
          merchantCountryCode: 'PL',
        },
        // Google Pay configuration
        googlePay: {
          merchantCountryCode: 'PL',
          testEnv: __DEV__, // Use test mode in development
          currencyCode: 'PLN',
        },
        // This enables BLIK automatically for Polish users!
        defaultBillingDetails: {
          address: {
            country: 'PL',
          },
        },
      });

      if (initError) {
        console.error('Payment sheet init error:', initError);
        throw initError;
      }

      // 3. Present Payment Sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        // User cancelled - not an error
        if (presentError.code === 'Canceled') {
          setLoading(false);
          return;
        }
        throw presentError;
      }

      // 4. Payment successful! Update database
      const { error: updateError } = await supabase.rpc('activate_subscription', {
        p_coach_id: user.id,
        p_stripe_subscription_id: data.subscriptionId,
        p_duration_months: plan === 'monthly' ? 1 : 12,
      });

      if (updateError) throw updateError;

      // 5. Record payment in history
      await supabase.rpc('record_payment', {
        p_coach_id: user.id,
        p_amount: plan === 'monthly' ? 39.00 : 390.00,
        p_currency: 'PLN',
        p_status: 'succeeded',
        p_stripe_payment_intent_id: data.paymentIntentId,
        p_payment_method: 'card', // Stripe will update this
        p_description: plan === 'monthly' ? 'Monthly subscription (39 PLN)' : 'Annual subscription (390 PLN)',
      });

      console.log('Payment successful! Subscription activated.');

      // Show custom success modal
      setShowSuccessModal(true);

    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert(
        t('subscription.error'), 
        error.message || t('subscription.errorMessage')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* App Icon */}
      <Animated.View entering={FadeInUp.delay(50)} style={styles.iconContainer}>
        <Image 
          source={require('../../../assets/images/icon.png')} 
          style={styles.appIcon}
        />
      </Animated.View>

      {/* Title */}
      <Animated.View entering={FadeInUp.delay(100)} style={styles.titleContainer}>
        <Text style={styles.title}>{t('subscription.title')}</Text>
        <Text style={styles.subtitle}>
          {t('subscription.subtitle')}
        </Text>
      </Animated.View>

      {/* Monthly Plan */}
      <Animated.View entering={FadeInUp.delay(150)} style={styles.planCard}>
        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planName}>{t('subscription.monthly')}</Text>
            <Text style={styles.planPrice}>
              39 zł<Text style={styles.planPeriod}>/{t('subscription.month')}</Text>
            </Text>
          </View>
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>⚡ {t('subscription.flexible')}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.planButton, loading && styles.planButtonDisabled]}
          onPress={() => handleSubscribe('monthly')}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.planButtonText}>{t('subscription.subscribeMonthly')}</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Yearly Plan */}
      <Animated.View entering={FadeInUp.delay(200)} style={[styles.planCard, styles.planCardFeatured]}>
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredBadgeText}>🔥 {t('subscription.bestValue')}</Text>
        </View>
        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planName}>{t('subscription.annual')}</Text>
            <Text style={styles.planPrice}>
              390 zł<Text style={styles.planPeriod}>/{t('subscription.year')}</Text>
            </Text>
            <Text style={styles.planSavings}>{t('subscription.save78')}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.planButton, styles.planButtonFeatured, loading && styles.planButtonDisabled]}
          onPress={() => handleSubscribe('yearly')}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.planButtonText}>{t('subscription.subscribeYearly')}</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Features List */}
      <Animated.View entering={FadeInUp.delay(250)} style={styles.features}>
        <Text style={styles.featuresTitle}>{t('subscription.included')}:</Text>
        
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          <Text style={styles.featureText}>{t('subscription.unlimitedClients')}</Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          <Text style={styles.featureText}>{t('subscription.analytics')}</Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          <Text style={styles.featureText}>{t('subscription.paymentTracking')}</Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          <Text style={styles.featureText}>{t('subscription.customColors')}</Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          <Text style={styles.featureText}>{t('subscription.prioritySupport')}</Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          <Text style={styles.featureText}>{t('subscription.exportData')}</Text>
        </View>
      </Animated.View>

      {/* Payment Methods */}
      <Animated.View entering={FadeInUp.delay(300)} style={styles.paymentMethods}>
        <Text style={styles.paymentMethodsText}>{t('subscription.paymentMethods')}:</Text>
        <View style={styles.paymentIcons}>
          <View style={styles.paymentIcon}>
            <Ionicons name="card" size={20} color={colors.textSecondary} />
            <Text style={styles.paymentIconText}>{t('subscription.card')}</Text>
          </View>
          <View style={styles.paymentIcon}>
            <Ionicons name="logo-apple" size={20} color={colors.textSecondary} />
            <Text style={styles.paymentIconText}>Apple Pay</Text>
          </View>
          <View style={styles.paymentIcon}>
            <Ionicons name="logo-google" size={20} color={colors.textSecondary} />
            <Text style={styles.paymentIconText}>Google Pay</Text>
          </View>
          <View style={styles.paymentIcon}>
            <Ionicons name="cash" size={20} color={colors.textSecondary} />
            <Text style={styles.paymentIconText}>BLIK</Text>
          </View>
        </View>
      </Animated.View>

      {/* Footer */}
      <Text style={styles.footer}>
        {t('subscription.footer')}
      </Text>
    </ScrollView>

    {/* Success Modal */}
    <SuccessModal
      visible={showSuccessModal}
      message="🎉 Your subscription is now active! Unlock all features and grow your fitness business!"
      onClose={() => {
        setShowSuccessModal(false);
        navigation.goBack();
      }}
    />
  </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    paddingTop: 48,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  planCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planCardFeatured: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  featuredBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  featuredBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    color: colors.background,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planName: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
    color: colors.primary,
  },
  planPeriod: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  planSavings: {
    fontSize: 14,
    color: colors.warning,
    marginTop: 4,
  },
  planBadge: {
    backgroundColor: colors.muted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  planBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: colors.textPrimary,
  },
  planButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  planButtonFeatured: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  planButtonDisabled: {
    opacity: 0.6,
  },
  planButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: colors.background,
  },
  features: {
    marginHorizontal: 16,
    marginVertical: 24,
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featuresTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  paymentMethods: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentMethodsText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  paymentIcons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  paymentIcon: {
    alignItems: 'center',
    gap: 4,
  },
  paymentIconText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  footer: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginHorizontal: 32,
    marginBottom: 40,
    lineHeight: 18,
  },
});
