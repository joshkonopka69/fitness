import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';

interface SessionNotesModalProps {
  visible: boolean;
  sessionId: string;
  onClose: () => void;
}

export default function SessionNotesModal({
  visible,
  sessionId,
  onClose,
}: SessionNotesModalProps) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load existing notes when modal opens
  useEffect(() => {
    if (visible && sessionId) {
      loadExistingNotes();
    }
  }, [visible, sessionId]);

  const loadExistingNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('training_sessions')
        .select('notes')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      
      // Load existing notes or keep empty
      setNotes(data?.notes || '');
    } catch (error: any) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!notes.trim()) {
      onClose();
      return;
    }

    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { error } = await supabase
        .from('training_sessions')
        .update({ notes: notes.trim() })
        .eq('id', sessionId);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNotes('');
      onClose();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotes('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleSkip}
        />
        
        <Animated.View
          entering={FadeInDown.springify().delay(100)}
          exiting={FadeOut}
          style={styles.modal}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="document-text" size={24} color={colors.primary} />
            </View>
            <Text style={styles.title}>Add Session Notes</Text>
            <Text style={styles.subtitle}>
              Record any important observations or details about this session
            </Text>
          </View>

          {/* Text Input */}
          <TextInput
            style={styles.textInput}
            placeholder="Enter notes here..."
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            autoFocus
          />

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.skipButton]}
              onPress={handleSkip}
              activeOpacity={0.7}
              disabled={saving}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              activeOpacity={0.9}
              disabled={saving}
            >
              {saving ? (
                <Text style={styles.saveButtonText}>Saving...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={colors.background} />
                  <Text style={styles.saveButtonText}>Save Notes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modal: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: colors.textPrimary,
    minHeight: 120,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    color: colors.textSecondary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    gap: 6,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: colors.background,
  },
});

