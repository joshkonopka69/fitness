import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useLanguage } from '../../contexts/LanguageContext';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

interface WelcomeScreenProps {
  navigation: any;
}

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const { language, setLanguage, t } = useLanguage();

  const features = [
    {
      icon: 'calendar' as const,
      title: t('welcome.sessionManagement'),
      description: t('welcome.sessionManagementDesc'),
    },
    {
      icon: 'people' as const,
      title: t('welcome.clientTracking'),
      description: t('welcome.clientTrackingDesc'),
    },
    {
      icon: 'trending-up' as const,
      title: t('welcome.analytics'),
      description: t('welcome.analyticsDesc'),
    },
    {
      icon: 'card' as const,
      title: t('welcome.paymentTracking'),
      description: t('welcome.paymentTrackingDesc'),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Animated background elements */}
      <Animated.View entering={FadeIn.duration(1000)} style={styles.bgGradient1} />
      <Animated.View entering={FadeIn.duration(1000).delay(200)} style={styles.bgGradient2} />

      <View style={styles.innerContent}>
        {/* Language Toggle */}
        <Animated.View entering={FadeInUp.delay(50)} style={styles.languageToggle}>
          <TouchableOpacity
            style={[styles.langButton, language === 'en' && styles.langButtonActive]}
            onPress={() => setLanguage('en')}
          >
            <Text style={[styles.langButtonText, language === 'en' && styles.langButtonTextActive]}>
              EN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langButton, language === 'pl' && styles.langButtonActive]}
            onPress={() => setLanguage('pl')}
          >
            <Text style={[styles.langButtonText, language === 'pl' && styles.langButtonTextActive]}>
              PL
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Logo & Title */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.header}>
          <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.logoContainer}>
            <Image 
              source={require('../../../assets/images/icon.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>
          <Text style={styles.title}>{t('welcome.title')}</Text>
          <Text style={styles.subtitle}>
            {t('welcome.subtitle')}
          </Text>
        </Animated.View>

        {/* Features Grid */}
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <Animated.View
              key={feature.title}
              entering={FadeInUp.delay(400 + index * 100).springify()}
              style={styles.featureCard}
            >
              <View style={styles.featureIconContainer}>
                <Ionicons name={feature.icon} size={24} color={colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* CTA Button */}
        <Animated.View entering={FadeInUp.delay(800)}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonText}>{t('welcome.getStarted')}</Text>
          </TouchableOpacity>
          <Text style={styles.footerText}>{t('welcome.footer')}</Text>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingTop: 60,
    paddingBottom: 40,
  },
  bgGradient1: {
    position: 'absolute',
    top: -200,
    right: -200,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: `${colors.primary}0D`,
    opacity: 0.5,
  },
  bgGradient2: {
    position: 'absolute',
    bottom: -200,
    left: -200,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: `${colors.secondary}0D`,
    opacity: 0.5,
  },
  innerContent: {
    flex: 1,
    paddingHorizontal: 24,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 3,
    borderColor: `${colors.primary}40`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 20,
  },
  languageToggle: {
    position: 'absolute',
    top: 20,
    right: 24,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  langButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  langButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.textSecondary,
  },
  langButtonTextActive: {
    color: colors.background,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresGrid: {
    gap: 16,
    marginBottom: 48,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${colors.primary}10`,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: colors.background,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
});



