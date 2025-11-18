import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import SuccessModal from '../../components/ui/SuccessModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const SESSION_COLORS = [
  { id: 'green', color: '#00FF88', name: 'Green' },
  { id: 'blue', color: '#0EA5E9', name: 'Blue' },
  { id: 'purple', color: '#8B5CF6', name: 'Purple' },
  { id: 'pink', color: '#EC4899', name: 'Pink' },
  { id: 'orange', color: '#F59E0B', name: 'Orange' },
  { id: 'red', color: '#EF4444', name: 'Red' },
  { id: 'cyan', color: '#06B6D4', name: 'Cyan' },
  { id: 'yellow', color: '#FCD34D', name: 'Yellow' },
  { id: 'emerald', color: '#10B981', name: 'Emerald' },
  { id: 'indigo', color: '#6366F1', name: 'Indigo' },
];

export default function CreateSessionScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const initialDate = route.params?.date ? new Date(route.params.date) : new Date();
  
  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(SESSION_COLORS[0].id);
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(() => {
    const end = new Date();
    end.setHours(end.getHours() + 1);
    return end;
  });
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const calculateDuration = () => {
    const diff = endTime.getTime() - startTime.getTime();
    return Math.round(diff / (1000 * 60)); // minutes
  };

  const handleColorChange = (colorId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedColor(colorId);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a session title');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const sessionDate = date.toISOString().split('T')[0];
      const startTimeStr = startTime.toTimeString().split(' ')[0].substring(0, 5);
      const endTimeStr = endTime.toTimeString().split(' ')[0].substring(0, 5);
      const duration = calculateDuration();
      const selectedColorObj = SESSION_COLORS.find(c => c.id === selectedColor);

      const { error } = await supabase
        .from('training_sessions')
        .insert({
          title: title.trim(),
          session_date: sessionDate,
          start_time: startTimeStr,
          end_time: endTimeStr,
          session_type: 'training', // Generic type - we use color for categorization now
          session_color: selectedColorObj?.color || '#00FF88',
          duration_minutes: duration,
          notes: notes.trim() || null,
          coach_id: user.id,
        });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccessModal(true);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const selectedColorObj = SESSION_COLORS.find(c => c.id === selectedColor) || SESSION_COLORS[0];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Session</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Session Color Picker */}
        <Animated.View entering={FadeInDown.delay(50)} style={styles.section}>
          <Text style={styles.sectionTitle}>Session Color</Text>
          <Text style={styles.sectionSubtitle}>Choose a color to identify this session</Text>
          <View style={styles.colorGrid}>
            {SESSION_COLORS.map((colorItem) => (
              <TouchableOpacity
                key={colorItem.id}
                style={[
                  styles.colorButton,
                  { backgroundColor: colorItem.color },
                  selectedColor === colorItem.id && styles.colorButtonActive,
                ]}
                onPress={() => handleColorChange(colorItem.id)}
                activeOpacity={0.8}
              >
                {selectedColor === colorItem.id && (
                  <Ionicons name="checkmark" size={24} color="#000000" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Session Title */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <Text style={styles.sectionTitle}>Session Title</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="create" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g., Morning Personal Training"
              placeholderTextColor="#6B7280"
              value={title}
              onChangeText={setTitle}
            />
          </View>
        </Animated.View>

        {/* Session Notes */}
        <Animated.View entering={FadeInDown.delay(125)} style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="document-text" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Session notes, exercises, goals..."
              placeholderTextColor="#6B7280"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </Animated.View>

        {/* Date & Time */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.section}>
          <Text style={styles.sectionTitle}>Date & Time</Text>

          {/* Date Picker */}
          <TouchableOpacity
            style={styles.dateTimeCard}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dateTimeIconContainer}>
              <Ionicons name="calendar-outline" size={24} color="#00FF88" />
            </View>
            <View style={styles.dateTimeContent}>
              <Text style={styles.dateTimeLabel}>Date</Text>
              <Text style={styles.dateTimeValue}>{formatDate(date)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>

          {/* Time Pickers Row */}
          <View style={styles.timePickersRow}>
            {/* Start Time */}
            <TouchableOpacity
              style={styles.timePickerCard}
              onPress={() => setShowStartTimePicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.timePickerIconContainer}>
                <Ionicons name="time-outline" size={20} color="#00FF88" />
              </View>
              <View style={styles.timePickerContent}>
                <Text style={styles.timePickerLabel}>Start</Text>
                <Text style={styles.timePickerValue}>{formatTime(startTime)}</Text>
              </View>
            </TouchableOpacity>

            {/* Arrow */}
            <View style={styles.timeArrow}>
              <Ionicons name="arrow-forward" size={20} color="#6B7280" />
            </View>

            {/* End Time */}
            <TouchableOpacity
              style={styles.timePickerCard}
              onPress={() => setShowEndTimePicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.timePickerIconContainer}>
                <Ionicons name="time-outline" size={20} color="#F59E0B" />
              </View>
              <View style={styles.timePickerContent}>
                <Text style={styles.timePickerLabel}>End</Text>
                <Text style={styles.timePickerValue}>{formatTime(endTime)}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Duration Display */}
          <View style={styles.durationDisplay}>
            <Ionicons name="timer-outline" size={18} color="#9CA3AF" />
            <Text style={styles.durationDisplayText}>
              Duration: {Math.floor(calculateDuration() / 60)}h {calculateDuration() % 60}min
            </Text>
          </View>
        </Animated.View>

        {/* Summary Card */}
        <Animated.View entering={FadeInDown.delay(250)} style={styles.summaryCard}>
          <View style={[styles.summaryColorBar, { backgroundColor: selectedColorObj.color }]} />
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>{title || 'Session Title'}</Text>
            <View style={styles.summaryRow}>
              <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
              <Text style={styles.summaryText}>{formatDate(date)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Ionicons name="time-outline" size={14} color="#9CA3AF" />
              <Text style={styles.summaryText}>
                {formatTime(startTime)} - {formatTime(endTime)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Ionicons name="timer-outline" size={14} color="#9CA3AF" />
              <Text style={styles.summaryText}>
                {Math.floor(calculateDuration() / 60)}h {calculateDuration() % 60}min
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Ionicons name="add-circle" size={20} color="#000000" />
          <Text style={styles.createButtonText}>
            {loading ? 'Creating...' : 'Create Session'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setDate(selectedDate);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
        />
      )}

      {showStartTimePicker && (
        <DateTimePicker
          value={startTime}
          mode="time"
          display="spinner"
          onChange={(event, selectedTime) => {
            setShowStartTimePicker(false);
            if (selectedTime) {
              setStartTime(selectedTime);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={endTime}
          mode="time"
          display="spinner"
          onChange={(event, selectedTime) => {
            setShowEndTimePicker(false);
            if (selectedTime) {
              setEndTime(selectedTime);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
        />
      )}

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        message="Session created successfully!"
        onClose={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorButtonActive: {
    borderColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    padding: 14,
    paddingLeft: 0,
    fontSize: 16,
    color: '#FFFFFF',
  },
  textArea: {
    minHeight: 80,
    maxHeight: 120,
    paddingTop: 10,
  },
  dateTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 14,
  },
  dateTimeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0A2818',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTimeContent: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  dateTimeValue: {
    fontSize: 17,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  timePickersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  timePickerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  timePickerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#0A2818',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerContent: {
    flex: 1,
  },
  timePickerLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  timePickerValue: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  timeArrow: {
    paddingHorizontal: 4,
  },
  durationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A2818',
    borderWidth: 1,
    borderColor: '#00FF88',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  durationDisplayText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#00FF88',
  },
  summaryCard: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
    overflow: 'hidden',
  },
  summaryColorBar: {
    width: 6,
  },
  summaryContent: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  summaryTitle: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF88',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
});
