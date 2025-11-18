import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Client {
  id: string;
  name: string;
  phone: string | null;
  membership_due_date: string | null;
  monthly_fee: number;
}

interface AttendanceRecord {
  client_id: string;
  present: boolean;
}

export default function AttendanceScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { session } = route.params;
  const [clients, setClients] = useState<Client[]>([]);
  const [attendance, setAttendance] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('coach_id', user.id)
        .eq('active', true)
        .order('name');

      if (clientsError) throw clientsError;

      // Fetch existing attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('session_id', session.id);

      if (attendanceError) throw attendanceError;

      // Create attendance map
      const attendanceMap = new Map<string, boolean>();
      attendanceData?.forEach(record => {
        attendanceMap.set(record.client_id, record.present);
      });

      setClients(clientsData || []);
      setAttendance(attendanceMap);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (clientId: string) => {
    const newAttendance = new Map(attendance);
    const currentStatus = newAttendance.get(clientId) ?? true;
    newAttendance.set(clientId, !currentStatus);
    setAttendance(newAttendance);
  };

  const getPaymentStatus = (client: Client) => {
    if (!client.membership_due_date) {
      return { text: 'No due date', color: '#A0A0A0' };
    }

    const dueDate = new Date(client.membership_due_date);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0) {
      return { text: 'Paid', color: '#00FF88' };
    } else {
      return { text: `Overdue ${Math.abs(diffDays)}d`, color: '#FF4444' };
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const attendanceRecords = Array.from(attendance.entries()).map(([clientId, present]) => ({
        session_id: session.id,
        client_id: clientId,
        present,
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(attendanceRecords, {
          onConflict: 'session_id,client_id',
        });

      if (error) throw error;

      Alert.alert('Success', 'Attendance saved successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const renderClientItem = ({ item }: { item: Client }) => {
    const isPresent = attendance.get(item.id) ?? true;
    const paymentStatus = getPaymentStatus(item);

    return (
      <TouchableOpacity
        style={[
          styles.clientCard,
          isPresent ? styles.presentCard : styles.absentCard
        ]}
        onPress={() => toggleAttendance(item.id)}
      >
        <View style={styles.clientLeft}>
          <View style={[styles.statusCircle, isPresent ? styles.presentCircle : styles.absentCircle]}>
            <Text style={styles.statusIcon}>{isPresent ? '✓' : '○'}</Text>
          </View>
        </View>

        <View style={styles.clientCenter}>
          <Text style={styles.clientName}>{item.name}</Text>
        </View>

        <View style={styles.clientRight}>
          <View style={[styles.paymentBadge, { backgroundColor: paymentStatus.color }]}>
            <Text style={styles.paymentText}>{paymentStatus.text}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading attendance...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTitle}>{session.title}</Text>
          <Text style={styles.sessionDate}>
            {new Date(session.session_date).toLocaleDateString()} at {session.start_time}
          </Text>
        </View>
      </View>

      <FlatList
        data={clients}
        renderItem={renderClientItem}
        keyExtractor={(item) => item.id}
        style={styles.clientsList}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : 'Save Attendance'}
        </Text>
      </TouchableOpacity>
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
    color: '#A0A0A0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  backButton: {
    marginRight: 16,
  },
  backText: {
    color: '#00FF88',
    fontSize: 16,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sessionDate: {
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 2,
  },
  clientsList: {
    flex: 1,
    padding: 16,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    minHeight: 60,
  },
  presentCard: {
    backgroundColor: '#1A3A1A',
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  absentCard: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#666666',
  },
  clientLeft: {
    marginRight: 16,
  },
  statusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presentCircle: {
    backgroundColor: '#00FF88',
  },
  absentCircle: {
    backgroundColor: '#666666',
  },
  statusIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  clientCenter: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  clientRight: {
    alignItems: 'flex-end',
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#00FF88',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});

