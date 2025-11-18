import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { categoryService } from '../../services/categoryService';
import { colors } from '../../theme/colors';

interface Client {
  id: string;
  name: string;
  phone: string | null;
  notes?: string;
  active: boolean;
}

export default function AddClientScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { client, preSelectedCategoryId } = route.params || {};
  const isEditing = !!client;
  
  // Debug log
  console.log('AddClientScreen - preSelectedCategoryId:', preSelectedCategoryId);

  const [name, setName] = useState(client?.name || '');
  const [phone, setPhone] = useState(client?.phone || '');
  const [notes, setNotes] = useState(client?.notes || '');
  const [loading, setLoading] = useState(false);
  const [showUpdateSuccessModal, setShowUpdateSuccessModal] = useState(false);
  const [showAddSuccessModal, setShowAddSuccessModal] = useState(false);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter client name');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const clientData = {
        coach_id: user.id,
        name: name.trim(),
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        active: true,
      };

      if (isEditing && client) {
        // Update existing client
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', client.id);

        if (error) throw error;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowUpdateSuccessModal(true);
      } else {
        // Create new client
        const { data: newClient, error } = await supabase
          .from('clients')
          .insert([clientData])
          .select()
          .single();

        if (error) throw error;

        // Przypisz do kategorii jeśli wybrana
        if (newClient && preSelectedCategoryId) {
          console.log('Assigning client to category:', preSelectedCategoryId);
          const { error: assignError } = await categoryService.assignClientToCategory(
            newClient.id,
            preSelectedCategoryId
          );
          
          if (assignError) {
            console.error('Error assigning to category:', assignError);
            Alert.alert(
              'Warning',
              'Client created but could not be assigned to category. You can assign manually later.'
            );
          } else {
            console.log('Successfully assigned client to category!');
          }
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowAddSuccessModal(true);
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!client) return;

    Alert.alert(
      'Delete Client',
      `Are you sure you want to delete ${client.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', client.id);

              if (error) throw error;

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setShowDeleteSuccessModal(true);
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Client' : 'Add New Client'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name Field */}
        <Animated.View entering={FadeInDown.delay(0)} style={styles.section}>
          <Text style={styles.label}>Client Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter full name"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoFocus={!isEditing}
          />
        </Animated.View>

        {/* Phone Field */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter phone number"
            placeholderTextColor={colors.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </Animated.View>

        {/* Notes Field */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Add any notes about this client..."
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </Animated.View>

        {/* Delete Button (only when editing) */}
        {isEditing && (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color={colors.destructive} />
              <Text style={styles.deleteButtonText}>Delete Client</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isEditing ? 'checkmark-circle' : 'add-circle'}
            size={24}
            color={colors.background}
          />
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Client'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Success Modals */}
      <SuccessModal
        visible={showUpdateSuccessModal}
        message="Client updated successfully!"
        onClose={() => {
          setShowUpdateSuccessModal(false);
          navigation.goBack();
        }}
      />
      <SuccessModal
        visible={showAddSuccessModal}
        message="Client added successfully!"
        onClose={() => {
          setShowAddSuccessModal(false);
          navigation.goBack();
        }}
      />
      <SuccessModal
        visible={showDeleteSuccessModal}
        message="Client deleted successfully!"
        onClose={() => {
          setShowDeleteSuccessModal(false);
          navigation.goBack();
        }}
      />
    </KeyboardAvoidingView>
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
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    fontFamily: 'Poppins-Regular',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
  },
  notesInput: {
    height: 150,
    paddingTop: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.destructive,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  deleteButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.destructive,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: colors.background,
  },
});
