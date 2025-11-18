import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface OverdueClient {
  id: string;
  name: string;
  phone: string | null;
  membership_due_date: string;
  monthly_fee: number;
  days_overdue: number;
}

export default function PaymentAlertsScreen() {
  const { user } = useAuth();
  const [overdueClients, setOverdueClients] = useState<OverdueClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverduePayments();
  }, []);

  const fetchOverduePayments = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('overdue_payments')
        .select('*')
        .eq('coach_id', user.id);

      if (error) throw error;
      setOverdueClients(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (clientId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          membership_due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
        .eq('id', clientId);

      if (error) throw error;

      Alert.alert('Success', 'Payment marked as received!');
      fetchOverduePayments(); // Refresh the list
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCallClient = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const renderOverdueClient = ({ item }: { item: OverdueClient }) => (
    <View style={styles.clientCard}>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.name}</Text>
        <Text style={styles.overdueText}>
          {item.days_overdue} days overdue
        </Text>
        {item.phone && (
          <TouchableOpacity
            style={styles.phoneButton}
            onPress={() => handleCallClient(item.phone!)}
          >
            <Text style={styles.phoneText}>📞 {item.phone}</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={styles.markPaidButton}
        onPress={() => handleMarkAsPaid(item.id)}
      >
        <Text style={styles.markPaidText}>Mark as Paid</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading payment alerts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Reminders</Text>
      </View>

      {overdueClients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>All payments up to date! ✅</Text>
          <Text style={styles.emptySubtitle}>
            No overdue payments found
          </Text>
        </View>
      ) : (
        <FlatList
          data={overdueClients}
          renderItem={renderOverdueClient}
          keyExtractor={(item) => item.id}
          style={styles.clientsList}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00FF88',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#A0A0A0',
    textAlign: 'center',
  },
  clientsList: {
    flex: 1,
    padding: 16,
  },
  clientCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  clientInfo: {
    flex: 1,
    marginBottom: 12,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  overdueText: {
    fontSize: 14,
    color: '#FF4444',
    fontWeight: '600',
    marginBottom: 8,
  },
  phoneButton: {
    alignSelf: 'flex-start',
  },
  phoneText: {
    fontSize: 14,
    color: '#00FF88',
  },
  markPaidButton: {
    backgroundColor: '#00FF88',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  markPaidText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
});

