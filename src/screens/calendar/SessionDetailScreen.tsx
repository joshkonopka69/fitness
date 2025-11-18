import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';

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

interface Session {
  id: string;
  title: string;
  session_date: string;
  start_time: string;
  end_time?: string;
  session_color?: string;
  notes?: string;
}

interface Attendee {
  id: string;
  client_id: string;
  present: boolean;
  clients: {
    name: string;
  };
}

export default function SessionDetailScreen({ route, navigation }: any) {
  const { sessionId } = route.params;
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Editable fields
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedColor, setSelectedColor] = useState('green');

  useEffect(() => {
    if (sessionId && user) {
      fetchSessionDetails();
    }
  }, [sessionId, user]);

  // Refresh data when screen comes into focus (after editing attendance)
  useFocusEffect(
    useCallback(() => {
      if (sessionId && user) {
        fetchSessionDetails();
      }
    }, [sessionId, user])
  );

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);

      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);
      setTitle(sessionData.title || '');
      setNotes(sessionData.notes || '');
      
      // Set selected color based on session_color
      const colorMatch = SESSION_COLORS.find(c => c.color === sessionData.session_color);
      if (colorMatch) {
        setSelectedColor(colorMatch.id);
      }

      // Fetch attendees
      const { data: attendeeData, error: attendeeError } = await supabase
        .from('attendance')
        .select('*, clients(name)')
        .eq('session_id', sessionId)
        .eq('present', true);

      if (attendeeError) throw attendeeError;
      setAttendees(attendeeData || []);
    } catch (error: any) {
      console.error('Error fetching session:', error);
      Alert.alert('Error', 'Failed to load session details');
    } finally {
      setLoading(false);
    }
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

    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const selectedColorObj = SESSION_COLORS.find(c => c.id === selectedColor);
      
      const { error } = await supabase
        .from('training_sessions')
        .update({
          title: title.trim(),
          notes: notes.trim() || null,
          session_color: selectedColorObj?.color || '#00FF88',
        })
        .eq('id', sessionId);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccessModal(true);
      
      // Refresh data
      fetchSessionDetails();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to update session');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session? This will also delete all attendance records.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: deleteSession,
        },
      ]
    );
  };

  const deleteSession = async () => {
    try {
      const { error } = await supabase
        .from('training_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to delete session');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Session not found</Text>
      </View>
    );
  }

  const sessionColor = session.session_color || '#00FF88';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Details</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={24} color={colors.destructive} />
        </TouchableOpacity>
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
              placeholder="Session title"
              placeholderTextColor="#6B7280"
              value={title}
              onChangeText={setTitle}
            />
          </View>
        </Animated.View>

        {/* Session Notes */}
        <Animated.View entering={FadeInDown.delay(125)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.badge}>
              <Ionicons name="sync" size={12} color="#00FF88" />
              <Text style={styles.badgeText}>Auto-saved</Text>
            </View>
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="document-text" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add session notes here...&#10;&#10;Example:&#10;- Warm up: 10 min&#10;- Main workout: HIIT&#10;- Cool down: 5 min"
              placeholderTextColor="#6B7280"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>
          <Text style={styles.helperText}>
            💡 Notes are saved for this session only. Click "Save Changes" to update.
          </Text>
        </Animated.View>

        {/* Date & Time Info (Read-only) */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.section}>
          <Text style={styles.sectionTitle}>Date & Time</Text>
          
          <View style={styles.dateTimeCard}>
            <View style={styles.dateTimeIconContainer}>
              <Ionicons name="calendar-outline" size={24} color="#00FF88" />
            </View>
            <View style={styles.dateTimeContent}>
              <Text style={styles.dateTimeLabel}>Date</Text>
              <Text style={styles.dateTimeValue}>{formatDate(session.session_date)}</Text>
            </View>
          </View>

          <View style={styles.timePickersRow}>
            <View style={styles.timePickerCard}>
              <View style={styles.timePickerIconContainer}>
                <Ionicons name="time-outline" size={20} color="#00FF88" />
              </View>
              <View style={styles.timePickerContent}>
                <Text style={styles.timePickerLabel}>Start</Text>
                <Text style={styles.timePickerValue}>
                  {session.start_time.substring(0, 5)}
                </Text>
              </View>
            </View>

            <View style={styles.timeArrow}>
              <Ionicons name="arrow-forward" size={20} color="#6B7280" />
            </View>

            <View style={styles.timePickerCard}>
              <View style={styles.timePickerIconContainer}>
                <Ionicons name="time-outline" size={20} color="#F59E0B" />
              </View>
              <View style={styles.timePickerContent}>
                <Text style={styles.timePickerLabel}>End</Text>
                <Text style={styles.timePickerValue}>
                  {session.end_time ? session.end_time.substring(0, 5) : '--:--'}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Attendees Section */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Attendees ({attendees.length})</Text>
            <View style={styles.badge}>
              <Ionicons name="people" size={12} color="#00FF88" />
              <Text style={styles.badgeText}>Live</Text>
            </View>
          </View>
          
          {attendees.length > 0 ? (
            <>
              {attendees.map((attendee, index) => (
                <View key={attendee.id} style={styles.attendeeCard}>
                  <View style={styles.attendeeAvatar}>
                    <Text style={styles.attendeeInitial}>
                      {attendee.clients.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.attendeeName}>{attendee.clients.name}</Text>
                  <Ionicons name="checkmark-circle" size={18} color="#00FF88" />
                </View>
              ))}
              <Text style={styles.helperText}>
                👥 Attendees list updates automatically when you edit attendance
              </Text>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="person-outline" size={36} color="#6B7280" />
              <Text style={styles.emptyStateText}>No attendees yet</Text>
              <Text style={styles.helperText}>
                Click "Edit Attendance" to mark who was present
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.navigate('Attendance', { sessionId: session.id })}
            activeOpacity={0.9}
          >
            <Ionicons name="create-outline" size={20} color="#00FF88" />
            <Text style={styles.secondaryButtonText}>Edit Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.9}
          >
            <Ionicons name="checkmark-circle" size={20} color="#000000" />
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown.springify()} style={styles.successModal}>
            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#00FF88" />
            </View>

            {/* Success Text */}
            <Text style={styles.successTitle}>Saved!</Text>
            <Text style={styles.successMessage}>Session updated successfully</Text>

            {/* Done Button */}
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowSuccessModal(false);
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    backgroundColor: '#0A0A0A',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00FF8820',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
    color: '#00FF88',
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#9CA3AF',
    marginTop: 8,
    lineHeight: 18,
  },
  colorIndicator: {
    width: 80,
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  inputIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  dateTimeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B98120',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  dateTimeContent: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  dateTimeValue: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  timePickersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timePickerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  timePickerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B98120',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  timePickerContent: {
    flex: 1,
  },
  timePickerLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#9CA3AF',
    marginBottom: 2,
  },
  timePickerValue: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  timeArrow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1F2937',
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  attendeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00FF88',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeInitial: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
  },
  attendeeName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  actionButtons: {
    marginTop: 16,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#00FF88',
  },
  saveButton: {
    backgroundColor: '#00FF88',
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModal: {
    backgroundColor: '#111827',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#00FF88',
    padding: 32,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
    color: '#00FF88',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
  },
  doneButton: {
    backgroundColor: '#00FF88',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
  },
});

