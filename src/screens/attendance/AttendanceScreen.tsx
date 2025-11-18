import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import SessionNotesModal from '../../components/ui/SessionNotesModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Client {
  id: string;
  name: string;
  phone: string | null;
}

interface Session {
  id: string;
  title: string;
  session_date: string;
  start_time: string;
  session_type: string;
}

export default function AttendanceScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { sessionId } = route.params;
  const [session, setSession] = useState<Session | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [attendance, setAttendance] = useState<Map<string, boolean>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [showNotesModal, setShowNotesModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Filter clients based on search
    if (searchQuery.trim() === '') {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.phone && client.phone.includes(searchQuery))
      );
      setFilteredClients(filtered);
    }
  }, [searchQuery, clients]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Fetch ALL active clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, phone')
        .eq('coach_id', user.id)
        .eq('active', true)
        .order('name');

      if (clientsError) throw clientsError;

      // Fetch existing attendance for this session
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('session_id', sessionId);

      if (attendanceError) throw attendanceError;

      // Create attendance map - default to false
      const attendanceMap = new Map<string, boolean>();
      clientsData?.forEach(client => {
        const record = attendanceData?.find(a => a.client_id === client.id);
        attendanceMap.set(client.id, record ? record.present : false);
      });

      setClients(clientsData || []);
      setFilteredClients(clientsData || []);
      setAttendance(attendanceMap);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (clientId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newAttendance = new Map(attendance);
    const currentStatus = newAttendance.get(clientId) ?? false;
    newAttendance.set(clientId, !currentStatus);
    setAttendance(newAttendance);
  };

  const handleCall = (phone: string | null) => {
    if (!phone) {
      Alert.alert('No Phone', 'This client does not have a phone number.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${phone}`);
  };

  const getPresentCount = () => {
    return Array.from(attendance.values()).filter(p => p).length;
  };

  const handleSave = async () => {
    if (!session) return;

    setSaving(true);
    try {
      // Only save records for clients who were present
      const attendanceRecords = Array.from(attendance.entries())
        .filter(([_, present]) => present) // Only present clients
        .map(([clientId, present]) => ({
          session_id: sessionId,
          client_id: clientId,
          present: true,
        }));

      // Delete all existing attendance for this session
      await supabase
        .from('attendance')
        .delete()
        .eq('session_id', sessionId);

      // Insert new attendance records
      if (attendanceRecords.length > 0) {
        const { error } = await supabase
          .from('attendance')
          .insert(attendanceRecords);

        if (error) throw error;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Show beautiful custom success modal
      setSavedCount(attendanceRecords.length);
      setShowSuccessModal(true);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const renderClientItem = ({ item, index }: { item: Client; index: number }) => {
    const isPresent = attendance.get(item.id) ?? false;

    return (
      <Animated.View
        entering={FadeInRight.delay(index * 30).springify()}
        exiting={FadeOutLeft.springify()}
      >
        <TouchableOpacity
          style={[
            styles.clientCard,
            isPresent && styles.clientCardPresent
          ]}
          onPress={() => toggleAttendance(item.id)}
          activeOpacity={0.7}
        >
          {/* Checkbox */}
          <View style={[styles.checkbox, isPresent && styles.checkboxChecked]}>
            {isPresent && (
              <Ionicons name="checkmark" size={20} color="#000000" />
            )}
          </View>

          {/* Client Info */}
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{item.name}</Text>
            {item.phone && (
              <Text style={styles.clientPhone}>{item.phone}</Text>
            )}
          </View>

          {/* Call Button */}
          {item.phone && (
            <TouchableOpacity
              style={styles.callButton}
              onPress={(e) => {
                e.stopPropagation();
                handleCall(item.phone);
              }}
            >
              <Ionicons name="call" size={18} color="#00FF88" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Session not found</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.saveButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const presentCount = getPresentCount();
  const formattedDate = new Date(session.session_date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{session.title}</Text>
          <Text style={styles.headerSubtitle}>
            {formattedDate} • {session.start_time.substring(0, 5)}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Present Count */}
      <Animated.View entering={FadeInDown.delay(50)} style={styles.countCard}>
        <Ionicons name="people" size={32} color="#00FF88" />
        <Text style={styles.countNumber}>{presentCount}</Text>
        <Text style={styles.countLabel}>
          Client{presentCount !== 1 ? 's' : ''} Present
        </Text>
      </Animated.View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Clients Header */}
      <View style={styles.clientsHeader}>
        <Text style={styles.clientsHeaderText}>
          {filteredClients.length} Client{filteredClients.length !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.clientsHeaderHint}>Tap to mark present</Text>
      </View>

      {/* Clients List */}
      <FlatList
        data={filteredClients}
        renderItem={renderClientItem}
        keyExtractor={(item) => item.id}
        style={styles.clientsList}
        contentContainerStyle={styles.clientsListContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Ionicons name="checkmark-circle" size={20} color="#000000" />
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : 'Save Attendance'}
        </Text>
      </TouchableOpacity>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown.springify()} style={styles.successModal}>
            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#00FF88" />
            </View>

            {/* Success Text */}
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successMessage}>
              Attendance saved successfully
            </Text>
            <Text style={styles.successCount}>
              {savedCount} {savedCount === 1 ? 'student' : 'students'}
            </Text>

            {/* Done Button */}
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowSuccessModal(false);
                navigation.goBack();
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Session Notes Modal */}
      <SessionNotesModal
        visible={showNotesModal}
        sessionId={sessionId}
        onClose={() => {
          setShowNotesModal(false);
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#9CA3AF',
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
  closeButton: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  countCard: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#00FF88',
    borderRadius: 16,
    padding: 20,
    margin: 16,
  },
  countNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00FF88',
    marginVertical: 8,
  },
  countLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  clientsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  clientsHeaderText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  clientsHeaderHint: {
    fontSize: 12,
    color: '#6B7280',
  },
  clientsList: {
    flex: 1,
  },
  clientsListContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#1F2937',
    gap: 12,
  },
  clientCardPresent: {
    borderColor: '#00FF88',
    backgroundColor: '#0A2818',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
  },
  checkboxChecked: {
    borderColor: '#00FF88',
    backgroundColor: '#00FF88',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  clientPhone: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF88',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
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
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
    color: '#00FF88',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 12,
  },
  successCount: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#00FF88',
    textAlign: 'center',
    marginBottom: 32,
  },
  doneButton: {
    backgroundColor: '#00FF88',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  doneButtonText: {
    color: '#000000',
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },
});
