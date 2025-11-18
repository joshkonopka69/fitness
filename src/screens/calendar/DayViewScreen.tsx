import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HOUR_HEIGHT = 80; // Each hour = 80px
const TIME_COLUMN_WIDTH = 60; // Left column with times
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2; // 20% of screen width (more sensitive)

interface Session {
  id: string;
  title: string;
  start_time: string; // Format: "HH:MM:SS"
  end_time?: string;
  session_date: string;
  session_type?: string;
  session_color?: string;
  notes?: string;
}

export default function DayViewScreen({ route, navigation }: any) {
  const initialDate = route.params?.date || new Date().toISOString().split('T')[0];
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [currentDate, setCurrentDate] = useState(initialDate);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Gesture animation values
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Format date for header display
  const formatHeaderDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Check if date is today
  const isToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return currentDate === today;
  };

  // Navigate to previous day
  const goToPreviousDay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const [year, month, day] = currentDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1);
    const newDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setCurrentDate(newDate);
  };

  // Navigate to next day
  const goToNextDay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const [year, month, day] = currentDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 1);
    const newDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setCurrentDate(newDate);
  };

  // Fetch sessions for current date
  useEffect(() => {
    fetchDaySessions();
  }, [currentDate]);

  // Refresh sessions when screen comes into focus (after creating/editing)
  useFocusEffect(
    useCallback(() => {
      fetchDaySessions();
    }, [currentDate])
  );

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Scroll to current time on mount if today
  useEffect(() => {
    if (isToday() && scrollViewRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      const scrollToPosition = Math.max(0, (currentHour - 1) * HOUR_HEIGHT);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: scrollToPosition, animated: true });
      }, 100);
    }
  }, [currentDate]);

  const fetchDaySessions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('coach_id', user.id)
        .eq('session_date', currentDate)
        .order('start_time');

      if (error) throw error;

      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle swipe gesture
  const gesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      translateX.value = event.translationX;
      opacity.value = 1 - Math.abs(event.translationX) / SCREEN_WIDTH * 0.3;
    })
    .onEnd((event) => {
      const velocity = event.velocityX;
      const translation = event.translationX;

      // More sensitive: Fast swipe OR past threshold
      if (Math.abs(velocity) > 300 || Math.abs(translation) > SWIPE_THRESHOLD) {
        if (translation > 0 || velocity > 0) {
          // Swipe right - NEXT day (forward in time)
          translateX.value = withSpring(SCREEN_WIDTH, { damping: 20 }, () => {
            runOnJS(goToNextDay)();
            translateX.value = 0;
            opacity.value = 1;
          });
        } else {
          // Swipe left - PREVIOUS day (back in time)
          translateX.value = withSpring(-SCREEN_WIDTH, { damping: 20 }, () => {
            runOnJS(goToPreviousDay)();
            translateX.value = 0;
            opacity.value = 1;
          });
        }
      } else {
        // Reset position
        translateX.value = withSpring(0, { damping: 20 });
        opacity.value = withSpring(1);
      }
    });

  // Animated style for swipe gesture
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

  // Convert time string to minutes from midnight
  const timeToMinutes = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Calculate session position and height
  const getSessionStyle = (session: Session) => {
    const startMinutes = timeToMinutes(session.start_time);
    const endMinutes = session.end_time 
      ? timeToMinutes(session.end_time)
      : startMinutes + 60; // Default 1 hour if no end time

    const top = (startMinutes / 60) * HOUR_HEIGHT;
    const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;

    return {
      top,
      height: Math.max(height, 40), // Minimum height
      left: TIME_COLUMN_WIDTH + 8,
      right: 8,
    };
  };

  // Get session type color
  const getSessionColor = (type?: string): [string, string] => {
    const colorMap: { [key: string]: [string, string] } = {
      strength: ['#FF6B6B', '#FF8E53'],
      cardio: ['#4ECDC4', '#44A08D'],
      hiit: ['#F7971E', '#FFD200'],
      yoga: ['#A8E6CF', '#56AB2F'],
      pilates: ['#C471ED', '#F64F59'],
      crossfit: ['#FF512F', '#DD2476'],
      personal: ['#00C9FF', '#92FE9D'],
      general: ['#00FF88', '#00D4AA'],
    };

    return colorMap[type || 'general'] || colorMap.general;
  };

  // Render time slots (hours)
  const renderTimeSlots = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return hours.map((hour) => {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      const isCurrentHour = isToday() && hour === currentTime.getHours();

      return (
        <View key={hour} style={styles.timeSlot}>
          <View style={styles.timeLabel}>
            <Text style={[styles.timeText, isCurrentHour && styles.currentTimeText]}>
              {timeString}
            </Text>
          </View>
          <View style={styles.timeLine} />
        </View>
      );
    });
  };

  // Render current time indicator (red line)
  const renderCurrentTimeIndicator = () => {
    if (!isToday()) return null;

    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const top = (minutes / 60) * HOUR_HEIGHT;

    return (
      <View style={[styles.currentTimeIndicator, { top }]}>
        <View style={styles.currentTimeDot} />
        <View style={styles.currentTimeLine} />
      </View>
    );
  };

  // Helper to create gradient from a single color
  const createGradient = (baseColor: string): [string, string] => {
    // Return the base color twice for now (solid color)
    // You can enhance this later to create a lighter/darker shade
    return [baseColor, baseColor];
  };

  // Render session blocks
  const renderSessions = () => {
    return sessions.map((session, index) => {
      const style = getSessionStyle(session);
      const sessionColor = session.session_color || '#00FF88';
      const gradientColors = createGradient(sessionColor);

      return (
        <Animated.View
          key={session.id}
          entering={FadeInUp.delay(index * 100).springify()}
          style={[styles.sessionBlock, style]}
        >
          <TouchableOpacity
            style={styles.sessionTouchable}
            onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sessionGradient}
            >
              <Text style={styles.sessionTitle} numberOfLines={2}>
                {session.title}
              </Text>
              <Text style={styles.sessionTime}>
                {session.start_time.substring(0, 5)}
                {session.end_time && ` - ${session.end_time.substring(0, 5)}`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      );
    });
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.dateSection}>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  onPress={goToPreviousDay}
                  style={styles.navButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={22} color={colors.primary} />
                </TouchableOpacity>

                <Text style={styles.headerDate}>{formatHeaderDate(currentDate)}</Text>

                <TouchableOpacity
                  onPress={goToNextDay}
                  style={styles.navButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
              
              {isToday() && (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayText}>Today</Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateSession', { selectedDate: currentDate })}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={28} color={colors.primary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Swipe hint */}
        <View style={styles.swipeHint}>
          <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
          <Text style={styles.swipeHintText}>Swipe to navigate days</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </View>

        {/* Day View Content with Gesture Handler */}
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.gestureContainer, animatedStyle]}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.dayView}>
                {/* Time slots */}
                <View style={styles.timeColumn}>
                  {renderTimeSlots()}
                </View>

                {/* Sessions container */}
                <View style={styles.sessionsContainer}>
                  {renderSessions()}
                  {renderCurrentTimeIndicator()}
                </View>
              </View>

              {/* Empty state */}
              {!loading && sessions.length === 0 && (
                <Animated.View entering={FadeInUp.delay(200)} style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
                  <Text style={styles.emptyTitle}>No Sessions</Text>
                  <Text style={styles.emptySubtitle}>
                    Tap the + button to create a session
                  </Text>
                </Animated.View>
              )}
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 48,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSection: {
    alignItems: 'center',
    gap: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerDate: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: colors.textPrimary,
    minWidth: 180,
    textAlign: 'center',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  todayText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: colors.background,
  },
  addButton: {
    padding: 8,
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  swipeHintText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  gestureContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  dayView: {
    flexDirection: 'row',
    minHeight: 24 * HOUR_HEIGHT,
  },
  timeColumn: {
    width: TIME_COLUMN_WIDTH,
  },
  timeSlot: {
    height: HOUR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timeLabel: {
    width: TIME_COLUMN_WIDTH - 8,
    paddingRight: 8,
    paddingTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  currentTimeText: {
    color: colors.primary,
    fontFamily: 'Poppins-SemiBold',
  },
  timeLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
    marginTop: 8,
  },
  sessionsContainer: {
    flex: 1,
    position: 'relative',
  },
  sessionBlock: {
    position: 'absolute',
    borderRadius: 12,
    overflow: 'hidden',
  },
  sessionTouchable: {
    flex: 1,
  },
  sessionGradient: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    gap: 4,
  },
  sessionTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  sessionTime: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  sessionTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  sessionTypeText: {
    fontSize: 10,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  sessionNotes: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 6,
    fontStyle: 'italic',
  },
  currentTimeIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  currentTimeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginLeft: -6,
  },
  currentTimeLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#FF4444',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
