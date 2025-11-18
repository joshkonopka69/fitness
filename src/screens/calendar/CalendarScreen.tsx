import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    FadeInDown,
    FadeInUp,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import TrialBanner from '../../components/ui/TrialBanner';
import TrialWelcomeModal from '../../components/ui/TrialWelcomeModal';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { sessionService } from '../../services/sessionService';
import { colors } from '../../theme/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;

const { width } = Dimensions.get('window');

interface Session {
  id: string;
  title: string;
  session_date: string;
  start_time: string;
  end_time?: string;
  session_type: string;
  session_color?: string;
  attendees?: Array<{
    id: string;
    client_id: string;
    present: boolean;
    clients: { id: string; name: string };
  }>;
}

export default function CalendarScreen({ navigation }: any) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Gesture animation values for swipe
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (user) {
      fetchSessions();
      checkFirstLogin();
    }
  }, [user, currentDate]);

  // Refresh sessions when screen comes into focus (after creating new session)
  useFocusEffect(
    useCallback(() => {
      if (user) {
    fetchSessions();
      }
    }, [user])
  );

  const checkFirstLogin = async () => {
    try {
      const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome');
      if (!hasSeenWelcome) {
        // Show welcome modal after a short delay
        setTimeout(() => {
          setShowWelcomeModal(true);
        }, 1000);
      }
    } catch (error) {
      console.error('Error checking first login:', error);
    }
  };

  const handleCloseWelcome = async () => {
    setShowWelcomeModal(false);
    try {
      await AsyncStorage.setItem('hasSeenWelcome', 'true');
    } catch (error) {
      console.error('Error saving welcome flag:', error);
    }
  };

  const fetchSessions = async () => {
    if (!user) return;
    setLoading(true);
    const data = await sessionService.getSessions(user.id);
    setSessions(data);
      setLoading(false);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const previousMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentDate(new Date());
  };

  // Handle swipe gesture for month navigation
  const gesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      translateX.value = event.translationX * 0.5; // Dampen the movement
      opacity.value = 1 - Math.abs(event.translationX) / SCREEN_WIDTH * 0.2;
    })
    .onEnd((event) => {
      const threshold = SCREEN_WIDTH * 0.3;
      
      if (event.translationX > threshold) {
        // Swipe right - previous month
        translateX.value = withSpring(SCREEN_WIDTH, {}, () => {
          runOnJS(previousMonth)();
          translateX.value = 0;
          opacity.value = 1;
        });
      } else if (event.translationX < -threshold) {
        // Swipe left - next month
        translateX.value = withSpring(-SCREEN_WIDTH, {}, () => {
          runOnJS(nextMonth)();
          translateX.value = 0;
          opacity.value = 1;
        });
      } else {
        // Reset position
        translateX.value = withSpring(0);
        opacity.value = withSpring(1);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const getSessionsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return sessions.filter((s) => s.session_date === dateStr);
  };

  const today = new Date();
  const isToday = (day: number) => {
    return (
      today.getDate() === day &&
      today.getMonth() === currentDate.getMonth() &&
      today.getFullYear() === currentDate.getFullYear()
    );
  };

  const todaysSessions = sessions.filter((s) => {
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return s.session_date === todayStr;
  });

  const getSessionTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('strength')) return { bg: `${colors.primary}20`, text: colors.primary, border: `${colors.primary}30` };
    if (lowerType.includes('cardio') || lowerType.includes('hiit')) return { bg: `${colors.secondary}20`, text: colors.secondary, border: `${colors.secondary}30` };
    if (lowerType.includes('yoga') || lowerType.includes('pilates')) return { bg: '#8B5CF620', text: '#8B5CF6', border: '#8B5CF630' };
    if (lowerType.includes('personal')) return { bg: '#F59E0B20', text: '#F59E0B', border: '#F59E0B30' };
    return { bg: `${colors.primary}20`, text: colors.primary, border: `${colors.primary}30` };
  };

  const getSessionIcon = (type: string): any => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('bjj') || lowerType.includes('martial')) return 'fitness';
    if (lowerType.includes('strength') || lowerType.includes('gym')) return 'barbell';
    if (lowerType.includes('cardio') || lowerType.includes('hiit')) return 'flash';
    if (lowerType.includes('yoga') || lowerType.includes('pilates')) return 'leaf';
    if (lowerType.includes('personal')) return 'person';
    if (lowerType.includes('crossfit')) return 'trophy';
    return 'calendar';
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Trial Banner */}
        <TrialBanner navigation={navigation} />
        
        {/* Trial Welcome Modal */}
        <TrialWelcomeModal 
          visible={showWelcomeModal}
          onClose={handleCloseWelcome}
        />
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('calendar.title')}</Text>
            <Text style={styles.subtitle}>{t('calendar.subtitle')}</Text>
          </View>
    <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateSession')}
    >
            <Ionicons name="add" size={28} color={colors.background} />
          </TouchableOpacity>
      </View>

        {/* Calendar Card with Gesture */}
        <GestureDetector gesture={gesture}>
          <Animated.View entering={FadeInDown.delay(100)} style={[styles.calendarCard, animatedStyle]}>
        {/* Calendar Header */}
        <View style={styles.calendarHeader}>
          <Text style={styles.monthYear}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          <View style={styles.navigationButtons}>
            <TouchableOpacity style={styles.navButton} onPress={previousMonth}>
              <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={nextMonth}>
              <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
    </TouchableOpacity>
          </View>
        </View>

        {/* Day Labels */}
        <View style={styles.dayLabels}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <Text key={i} style={styles.dayLabel}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.dayCell} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const daySessions = getSessionsForDate(day);
            const hasSession = daySessions.length > 0;

  return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayCell,
                  isToday(day) && styles.todayCell,
                ]}
                onPress={() => {
                  // Format date properly to avoid timezone issues
                  const year = currentDate.getFullYear();
                  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                  const dayStr = String(day).padStart(2, '0');
                  const dateString = `${year}-${month}-${dayStr}`; // Format: YYYY-MM-DD
                  
                  navigation.navigate('DayView', { 
                    date: dateString,
                  });
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayNumber, isToday(day) && styles.todayNumber]}>
                  {day}
                </Text>
                {hasSession && (
                  <View style={styles.sessionDots}>
                    {daySessions.slice(0, 3).map((session, idx) => (
                      <View 
                        key={idx} 
                        style={[
                          styles.dot, 
                          { backgroundColor: session.session_color || '#00FF88' }
                        ]} 
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
          </Animated.View>
        </GestureDetector>

        {/* Swipe Hint */}
        <View style={styles.swipeHint}>
          <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
          <Text style={styles.swipeHintText}>{t('calendar.swipeHint')}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </View>

        {/* Today's Sessions */}
        <View style={styles.todaySessions}>
        <Text style={styles.sectionTitle}>{t('calendar.todaySessions')}</Text>
        {todaysSessions.length > 0 ? (
          todaysSessions.map((session, index) => {
            const sessionColor = session.session_color || '#00FF88';
            const attendees = session.attendees || [];
            const attendeeCount = attendees.length;

            return (
              <Animated.View
                key={session.id}
                entering={FadeInUp.delay(index * 100).springify()}
              >
                <TouchableOpacity
                  style={styles.sessionCard}
                  onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.sessionIcon, { backgroundColor: `${sessionColor}20` }]}>
                    <Ionicons 
                      name="calendar" 
                      size={24} 
                      color={sessionColor} 
                    />
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <View style={styles.sessionMeta}>
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.sessionTime}>
                        {session.start_time.substring(0, 5)}
                        {session.end_time ? ` - ${session.end_time.substring(0, 5)}` : ''}
                      </Text>
                      {attendeeCount > 0 && (
                        <>
                          <View style={styles.metaDivider} />
                          <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                          <Text style={styles.sessionAttendees}>{attendeeCount}</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </Animated.View>
            );
          })
        ) : (
          <Animated.View entering={FadeInUp.delay(100)} style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{t('calendar.noSessions')}</Text>
      <TouchableOpacity
              style={styles.emptyStateButton}
        onPress={() => navigation.navigate('CreateSession')}
      >
              <Ionicons name="add" size={16} color={colors.background} />
              <Text style={styles.emptyStateButtonText}>{t('calendar.createSession')}</Text>
      </TouchableOpacity>
          </Animated.View>
        )}
    </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 56,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  todayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    marginHorizontal: 16,
  },
  swipeHintText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  calendarCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthYear: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: colors.textPrimary,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabels: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayLabel: {
    width: (width - 64) / 7,
    textAlign: 'center',
    fontSize: 12,
    color: colors.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayCell: {
    width: (width - 64) / 7,
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: `${colors.muted}80`,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  todayCell: {
    backgroundColor: `${colors.primary}20`,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayNumber: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: colors.textPrimary,
  },
  todayNumber: {
    fontFamily: 'Poppins-SemiBold',
    color: colors.primary,
  },
  sessionDots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    // backgroundColor set dynamically per session
  },
  todaySessions: {
    padding: 16,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionTime: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textSecondary,
    opacity: 0.5,
  },
  sessionAttendees: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: colors.background,
  },
});
