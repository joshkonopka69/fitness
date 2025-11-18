import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { colors } from '../../theme/colors';

export default function LoginScreen({ navigation }: any) {
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isLogin && !name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, name);
        Alert.alert('Success', 'Account created successfully!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Animated background */}
        <Animated.View entering={FadeIn.duration(1000)} style={styles.bgGradient1} />
        <Animated.View entering={FadeIn.duration(1000).delay(200)} style={styles.bgGradient2} />

        <View style={styles.content}>
          {/* Back Button */}
          {navigation.canGoBack() && (
            <Animated.View entering={FadeInUp.delay(100)}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
                <Text style={styles.backText}>{t('login.back')}</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Auth Card */}
          <Animated.View entering={FadeInUp.delay(200)} style={styles.card}>
            {/* Logo */}
            <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.logoContainer}>
              <Image 
                source={require('../../../assets/images/icon.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </Animated.View>

            <Text style={styles.title}>
              {isLogin ? t('login.welcomeBack') : t('login.createAccount')}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin ? t('login.signInTo') : t('login.startManaging')}
            </Text>

            {/* Form */}
            <View style={styles.form}>
              {!isLogin && (
                <Animated.View entering={FadeInUp.delay(400)}>
                  <Input
                    label={t('login.fullName')}
                    value={name}
                    onChangeText={setName}
                    placeholder="John Doe"
                    autoCapitalize="words"
                  />
                </Animated.View>
              )}

              <Animated.View entering={FadeInUp.delay(isLogin ? 400 : 450)}>
                <View>
                  <Text style={styles.label}>{t('login.email')}</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="mail"
                      size={20}
                      color={colors.textSecondary}
                      style={styles.inputIcon}
                    />
                    <Input
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      inputStyle={styles.inputWithIcon}
                      containerStyle={styles.inputField}
                    />
                  </View>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(isLogin ? 450 : 500)}>
                <Input
                  label={t('login.password')}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry
                />
              </Animated.View>

              {isLogin && (
                <Animated.View entering={FadeInUp.delay(500)}>
                  <TouchableOpacity style={styles.forgotButton}>
                    <Text style={styles.forgotText}>{t('login.forgotPassword')}</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}

              <Animated.View entering={FadeInUp.delay(isLogin ? 550 : 550)}>
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleAuth}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Text style={styles.buttonText}>
                      {isLogin ? t('login.signIn') : t('login.createAccount')}
                    </Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Toggle Login/Register */}
            <Animated.View entering={FadeInUp.delay(600)}>
              <View style={styles.toggleContainer}>
                <Text style={styles.toggleText}>
                  {isLogin ? t('login.noAccount') : t('login.hasAccount')}{' '}
                </Text>
                <TouchableOpacity onPress={() => setIsLogin(!isLogin)} disabled={loading}>
                  <Text style={styles.toggleLink}>
                    {isLogin ? t('login.signUp') : t('login.signIn')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </Animated.View>

          {/* Terms */}
          <Animated.View entering={FadeInUp.delay(700)}>
            <Text style={styles.terms}>
              {t('login.terms')}
            </Text>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 40,
  },
  bgGradient1: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: `${colors.primary}0D`,
    opacity: 0.5,
  },
  bgGradient2: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: `${colors.secondary}0D`,
    opacity: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  backText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 3,
    borderColor: `${colors.primary}40`,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  logoImage: {
    width: 70,
    height: 70,
    borderRadius: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
  },
  inputWithIcon: {
    paddingLeft: 48,
  },
  inputField: {
    marginBottom: 0,
  },
  forgotButton: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontSize: 14,
    color: colors.primary,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: colors.background,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  toggleText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  toggleLink: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: 'Poppins-SemiBold',
  },
  terms: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});
