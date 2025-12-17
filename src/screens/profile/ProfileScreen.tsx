import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInLeft, FadeInUp } from 'react-native-reanimated';
import { Card, CardContent } from '../../components/ui/Card';
import { LoadingState } from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePurchases } from '../../contexts/PurchasesContext';
import { CoachProfile, profileService, ProfileStats } from '../../services/profileService';
import { colors as defaultColors } from '../../theme/colors';
import { getSubscriptionBadge } from '../../utils/subscription';

export default function ProfileScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const { isPro, isTrialActive, customerInfo } = usePurchases();
  const colors = defaultColors; // Always use dark theme
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [profileData, statsData] = await Promise.all([
        profileService.getCoachProfile(user.id),
        profileService.getProfileStats(user.id),
      ]);

      setProfile(profileData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingState message="Loading profile..." />;
  }

  const menuItems = [
    {
      icon: 'shield',
      title: t('profile.privacySecurity'),
      label: t('profile.privacySecurity'),
      description: t('profile.privacyDesc'),
      onPress: () => setShowPrivacyModal(true),
    },
  ];

  if (!profile || !stats) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color={colors.destructive} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = profile.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'NA';

  // Get premium button config using RevenueCat state
  const subscriptionBadge = getSubscriptionBadge({ isPro, isTrialActive, customerInfo });
  
  const getPremiumButtonConfig = () => {
    if (isPro && !isTrialActive) {
      return { 
        text: 'PRO ✓', 
        color: colors.primary, 
        bgColor: `${colors.primary}20` 
      };
    }

    if (isTrialActive) {
      return { 
        text: 'Trial Active', 
        color: '#FFD700', 
        bgColor: 'rgba(255, 215, 0, 0.15)' 
      };
    }

    return { 
      text: 'Get PRO', 
      color: colors.primary, 
      bgColor: `${colors.primary}20` 
    };
  };

  const premiumConfig = getPremiumButtonConfig();
  const isPremium = isPro && !isTrialActive;

  return (
    <>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{t('profile.title')}</Text>
            <Text style={styles.subtitle}>{t('profile.subtitle')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.premiumButton, { backgroundColor: premiumConfig.bgColor }]}
            onPress={() => {
              if (!isPremium) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate('Subscription');
              }
            }}
            activeOpacity={isPremium ? 1 : 0.7}
          >
            <Text style={[styles.premiumButtonText, { color: premiumConfig.color }]}>
              {premiumConfig.text}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Card */}
      <Animated.View entering={FadeInUp.delay(100)}>
        <Card style={styles.profileCard}>
          <CardContent>
            <View style={styles.profileHeader}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={styles.profileAvatar}
              >
                <Text style={styles.profileAvatarText}>{initials}</Text>
              </LinearGradient>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile.name}</Text>
                <Text style={styles.profileEmail}>{profile.email}</Text>
                <View style={styles.profileMeta}>
                  {profile.gymName && (
                    <>
                      <Text style={styles.profileMetaText}>{profile.gymName}</Text>
                      <Text style={styles.profileMetaText}>•</Text>
                    </>
                  )}
                  <Text style={styles.profileMetaText}>Since {profile.since}</Text>
                </View>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statItemValue, { color: colors.primary }]}>
                  {stats.totalSessions}
                </Text>
                <Text style={styles.statItemLabel}>{t('profile.sessions')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statItemValue, { color: colors.primary }]}>
                  {stats.totalClients}
                </Text>
                <Text style={styles.statItemLabel}>{t('profile.clients')}</Text>
              </View>
            </View>
          </CardContent>
        </Card>
      </Animated.View>

      {/* Subscription Card - Only show if not premium */}
      {!isPremium && (
        <Animated.View entering={FadeInUp.delay(200)}>
          <TouchableOpacity 
            style={styles.subscriptionCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('Subscription');
            }}
            activeOpacity={0.95}
          >
            <LinearGradient
              colors={[colors.primary, '#00CC77', colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.subscriptionGradient}
            >
              <View style={styles.subscriptionContent}>
                <View style={styles.subscriptionLeft}>
                  <Text style={styles.subscriptionHeadline}>Unlock Premium 🚀</Text>
                  <Text style={styles.subscriptionSubtext}>
                    ✓ Unlimited clients{'\n'}
                    ✓ Advanced analytics{'\n'}
                    ✓ Cloud sync{'\n'}
                    ✓ Priority support
                  </Text>
                </View>
                <View style={styles.subscriptionRight}>
                  <View style={styles.subscriptionCTA}>
                    <Text style={styles.subscriptionCTAText}>Upgrade</Text>
                    <Ionicons name="arrow-forward-circle" size={24} color={colors.background} />
                  </View>
                  <Text style={styles.subscriptionPrice}>From 39 zł/mo</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <Animated.View key={item.label} entering={FadeInLeft.delay(index * 50)}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name={item.icon as any} size={20} color={colors.textPrimary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/* Logout Button */}
      <Animated.View entering={FadeInUp.delay(400)}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color={colors.destructive} />
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>{t('profile.appInfo')}</Text>
        <Text style={styles.appInfoText}>{t('profile.madeFor')}</Text>
      </View>
    </ScrollView>

    {/* Privacy Modal */}
    <Modal
      animationType="fade"
      transparent={true}
      visible={showPrivacyModal}
      onRequestClose={() => setShowPrivacyModal(false)}
    >
      <View style={styles.modalOverlay}>
        <Animated.View entering={FadeInUp.duration(300)} style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>{t('privacy.title')}</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowPrivacyModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalSectionTitle}>{t('privacy.dataProtected')}</Text>
            
            <View style={styles.privacyItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={styles.privacyItemText}>{t('privacy.secureStorage')}</Text>
            </View>
            <View style={styles.privacyItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={styles.privacyItemText}>{t('privacy.rlsEnabled')}</Text>
            </View>
            <View style={styles.privacyItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={styles.privacyItemText}>{t('privacy.accessControl')}</Text>
            </View>
            <View style={styles.privacyItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={styles.privacyItemText}>{t('privacy.encryption')}</Text>
            </View>
            <View style={styles.privacyItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={styles.privacyItemText}>{t('privacy.noSharing')}</Text>
            </View>
            <View style={styles.privacyItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={styles.privacyItemText}>{t('privacy.clientsPrivate')}</Text>
            </View>
            <View style={styles.privacyItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={styles.privacyItemText}>{t('privacy.paymentsConfidential')}</Text>
            </View>

            <Text style={styles.modalSectionTitle}>{t('privacy.dbSecurity')}</Text>
            
            <View style={styles.privacyItem}>
              <Ionicons name="shield" size={20} color={colors.secondary} />
              <Text style={styles.privacyItemText}>{t('privacy.coachIsolation')}</Text>
            </View>
            <View style={styles.privacyItem}>
              <Ionicons name="shield" size={20} color={colors.secondary} />
              <Text style={styles.privacyItemText}>{t('privacy.sessionIsolation')}</Text>
            </View>
            <View style={styles.privacyItem}>
              <Ionicons name="shield" size={20} color={colors.secondary} />
              <Text style={styles.privacyItemText}>{t('privacy.paymentProtection')}</Text>
            </View>
            <View style={styles.privacyItem}>
              <Ionicons name="shield" size={20} color={colors.secondary} />
              <Text style={styles.privacyItemText}>{t('privacy.authRequired')}</Text>
            </View>

            <Text style={styles.privacyPriority}>{t('privacy.priority')}</Text>
          </ScrollView>

          <TouchableOpacity 
            style={styles.modalButton}
            onPress={() => setShowPrivacyModal(false)}
          >
            <Text style={styles.modalButtonText}>{t('privacy.gotIt')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: defaultColors.background,
  },
  header: {
    padding: 16,
    paddingTop: 56,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: defaultColors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: defaultColors.textSecondary,
  },
  premiumButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 12,
  },
  premiumButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  profileCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 24,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 32,
    fontFamily: 'Poppins-SemiBold',
    color: defaultColors.background,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: defaultColors.textPrimary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: defaultColors.textSecondary,
    marginBottom: 8,
  },
  profileMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  profileMetaText: {
    fontSize: 12,
    color: defaultColors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: defaultColors.border,
    gap: 32,
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    minWidth: 100,
  },
  statItemValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: defaultColors.textPrimary,
    marginBottom: 4,
  },
  statItemLabel: {
    fontSize: 12,
    color: defaultColors.textSecondary,
  },
  settingsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: defaultColors.textPrimary,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: defaultColors.textSecondary,
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: defaultColors.primary,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: defaultColors.background,
  },
  menuContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: defaultColors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: defaultColors.border,
    gap: 12,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: defaultColors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: defaultColors.textPrimary,
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 12,
    color: defaultColors.textSecondary,
  },
  subscriptionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: defaultColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  subscriptionGradient: {
    padding: 20,
    minHeight: 140,
  },
  subscriptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionLeft: {
    flex: 1,
  },
  subscriptionHeadline: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: defaultColors.background,
    marginBottom: 12,
  },
  subscriptionSubtext: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: defaultColors.background,
    lineHeight: 20,
    opacity: 0.95,
  },
  subscriptionRight: {
    alignItems: 'flex-end',
  },
  subscriptionCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginBottom: 8,
  },
  subscriptionCTAText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: defaultColors.background,
  },
  subscriptionPrice: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    color: defaultColors.background,
    opacity: 0.9,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: `${defaultColors.destructive}10`,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${defaultColors.destructive}30`,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: defaultColors.destructive,
  },
  appInfo: {
    alignItems: 'center',
    padding: 32,
    paddingTop: 16,
  },
  appInfoText: {
    fontSize: 12,
    color: defaultColors.textSecondary,
    marginBottom: 4,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: defaultColors.background,
  },
  errorText: {
    fontSize: 16,
    color: defaultColors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: defaultColors.card,
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: defaultColors.border,
  },
  modalHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: defaultColors.border,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${defaultColors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: defaultColors.textPrimary,
    textAlign: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  modalBody: {
    padding: 24,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: defaultColors.textPrimary,
    marginBottom: 16,
    marginTop: 8,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  privacyItemText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: defaultColors.textSecondary,
    lineHeight: 20,
  },
  privacyPriority: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: defaultColors.primary,
    textAlign: 'center',
    marginTop: 24,
  },
  modalButton: {
    backgroundColor: defaultColors.primary,
    margin: 24,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: defaultColors.background,
  },
});
