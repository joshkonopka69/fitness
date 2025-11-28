import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
} from 'react-native-reanimated';
import { useLanguage } from '../../contexts/LanguageContext';
import { colors } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
  navigation: any;
}

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const { language, setLanguage, t } = useLanguage();

  const features = [
    {
      icon: 'fitness-outline' as const,
      title: t('welcome.sessionManagement'),
      gradient: ['#00FF88', '#00CC6A'],
    },
    {
      icon: 'people-outline' as const,
      title: t('welcome.clientTracking'),
      gradient: ['#0EA5E9', '#0284C7'],
    },
    {
      icon: 'stats-chart-outline' as const,
      title: t('welcome.analytics'),
      gradient: ['#8B5CF6', '#7C3AED'],
    },
    {
      icon: 'wallet-outline' as const,
      title: t('welcome.paymentTracking'),
      gradient: ['#F59E0B', '#D97706'],
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Animated Background Orbs */}
      <Animated.View entering={FadeIn.duration(1500)} style={styles.orb1} />
      <Animated.View entering={FadeIn.duration(1500).delay(300)} style={styles.orb2} />
      <Animated.View entering={FadeIn.duration(1500).delay(600)} style={styles.orb3} />

      {/* Language Toggle */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.languageToggle}>
        <TouchableOpacity
          style={[styles.langButton, language === 'en' && styles.langButtonActive]}
          onPress={() => setLanguage('en')}
        >
          <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>EN</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.langButton, language === 'pl' && styles.langButtonActive]}
          onPress={() => setLanguage('pl')}
        >
          <Text style={[styles.langText, language === 'pl' && styles.langTextActive]}>PL</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Hero Section */}
      <Animated.View entering={FadeInUp.delay(100)} style={styles.heroSection}>
        {/* Glowing Logo */}
        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.logoWrapper}>
          <LinearGradient
            colors={['#00FF88', '#00CC6A', '#00FF88']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            <Ionicons name="barbell" size={48} color="#000" />
          </LinearGradient>
          <View style={styles.logoGlow} />
        </Animated.View>

        {/* Title with Gradient Effect */}
        <Animated.View entering={FadeInUp.delay(300)}>
          <Text style={styles.brandName}>FitnessGuru</Text>
          <View style={styles.titleRow}>
            <Text style={styles.titleWhite}>{t('welcome.title').split(' ')[0]} </Text>
            <Text style={styles.titleGreen}>{t('welcome.title').split(' ').slice(1).join(' ')}</Text>
          </View>
        </Animated.View>

        <Animated.Text entering={FadeInUp.delay(400)} style={styles.subtitle}>
          {t('welcome.subtitle')}
        </Animated.Text>
      </Animated.View>

      {/* Feature Pills */}
      <Animated.View entering={FadeInUp.delay(500)} style={styles.featuresContainer}>
        <View style={styles.featuresRow}>
          {features.map((feature, index) => (
            <Animated.View
              key={feature.title}
              entering={SlideInRight.delay(600 + index * 100).springify()}
            >
              <LinearGradient
                colors={feature.gradient as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featurePill}
              >
                <Ionicons name={feature.icon} size={18} color="#000" />
                <Text style={styles.featurePillText}>{feature.title}</Text>
              </LinearGradient>
            </Animated.View>
          ))}
        </View>
      </Animated.View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Stats */}
        <Animated.View entering={FadeInUp.delay(800)} style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>10K+</Text>
            <Text style={styles.statLabel}>Coaches</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>50K+</Text>
            <Text style={styles.statLabel}>Clients</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>4.9★</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </Animated.View>

        {/* CTA Button */}
        <Animated.View entering={FadeInUp.delay(900)}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#00FF88', '#00E67A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>{t('welcome.getStarted')}</Text>
              <View style={styles.ctaIconWrapper}>
                <Ionicons name="arrow-forward" size={20} color="#000" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.Text entering={FadeIn.delay(1000)} style={styles.footerText}>
          {t('welcome.footer')}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  // Background orbs
  orb1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#00FF88',
    opacity: 0.08,
  },
  orb2: {
    position: 'absolute',
    top: height * 0.3,
    left: -150,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: '#0EA5E9',
    opacity: 0.06,
  },
  orb3: {
    position: 'absolute',
    bottom: -100,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#8B5CF6',
    opacity: 0.08,
  },
  // Language toggle
  languageToggle: {
    position: 'absolute',
    top: 60,
    right: 24,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
    zIndex: 10,
  },
  langButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  langButtonActive: {
    backgroundColor: '#00FF88',
  },
  langText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  langTextActive: {
    color: '#000',
  },
  // Hero section
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  logoWrapper: {
    position: 'relative',
    marginBottom: 32,
  },
  logoGradient: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 38,
    backgroundColor: '#00FF88',
    opacity: 0.2,
    zIndex: -1,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00FF88',
    textAlign: 'center',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  titleWhite: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
  },
  titleGreen: {
    fontSize: 36,
    fontWeight: '800',
    color: '#00FF88',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
    maxWidth: 300,
  },
  // Features
  featuresContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  featurePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  // Bottom section
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    paddingVertical: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#00FF88',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  // CTA Button
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  ctaIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 20,
  },
});
