import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';

interface Client {
  id: string;
  name: string;
  phone?: string;
  balance_owed: number;
  notes?: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  status: 'paid' | 'waiting';
  payment_date: string;
  notes?: string;
}

export default function ClientDetailScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { clientId } = route.params;

  const [client, setClient] = useState<Client | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);

  // Payment modal
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'paid' | 'waiting'>('paid');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [clientId])
  );

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('client_id', clientId)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      const formattedPayments: PaymentRecord[] = paymentsData.map((p: any) => ({
        id: p.id,
        amount: p.amount,
        status: p.payment_type === 'paid' ? 'paid' : 'waiting',
        payment_date: p.payment_date,
        notes: p.notes,
      }));

      setPayments(formattedPayments);

      // Calculate total paid
      const paid = formattedPayments
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);
      setTotalPaid(paid);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue === 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    try {
      // Save payment
      const { error: paymentError } = await supabase.from('payments').insert({
        coach_id: user?.id,
        client_id: clientId,
        amount: Math.abs(amountValue),
        payment_type: status,
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        notes: title.trim() || null,
      });

      if (paymentError) throw paymentError;

      // Update balance
      let newBalance = client?.balance_owed || 0;
      if (status === 'paid') {
        newBalance -= Math.abs(amountValue); // Payment reduces balance
      } else {
        newBalance += Math.abs(amountValue); // Waiting payment increases balance
      }

      const { error: updateError } = await supabase
        .from('clients')
        .update({ balance_owed: newBalance })
        .eq('id', clientId);

      if (updateError) throw updateError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowModal(false);
      setAmount('');
      setTitle('');
      fetchData();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (paymentId: string, amount: number, status: 'paid' | 'waiting') => {
    Alert.alert(
      'Delete Payment',
      'Are you sure you want to delete this payment record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete payment
              const { error: deleteError } = await supabase
                .from('payments')
                .delete()
                .eq('id', paymentId);

              if (deleteError) throw deleteError;

              // Update balance (reverse the original operation)
              let newBalance = client?.balance_owed || 0;
              if (status === 'paid') {
                newBalance += amount; // Add back what was paid
              } else {
                newBalance -= amount; // Remove what was owed
              }

              const { error: updateError } = await supabase
                .from('clients')
                .update({ balance_owed: newBalance })
                .eq('id', clientId);

              if (updateError) throw updateError;

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              fetchData();
            } catch (error: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  if (loading || !client) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{client.name}</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('AddClient', { client })}
        >
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Animated.View entering={FadeInDown.delay(0)} style={styles.statCard}>
            <Text style={styles.statLabel}>Total Paid</Text>
            <Text style={styles.statValue}>{totalPaid} zł</Text>
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100)} style={styles.statCard}>
            <Text style={styles.statLabel}>Balance Owed</Text>
            <Text style={[styles.statValue, { color: client.balance_owed > 0 ? colors.warning : colors.primary }]}>
              {client.balance_owed} zł
            </Text>
            <Ionicons
              name={client.balance_owed > 0 ? 'time' : 'checkmark-circle'}
              size={24}
              color={client.balance_owed > 0 ? colors.warning : colors.primary}
            />
          </Animated.View>
        </View>

        {/* Client Notes Section */}
        {client.notes && (
          <Animated.View entering={FadeInDown.delay(150)} style={styles.notesSection}>
            <View style={styles.notesSectionHeader}>
              <Ionicons name="document-text" size={20} color={colors.primary} />
              <Text style={styles.notesSectionTitle}>Trainer Notes</Text>
            </View>
            <Text style={styles.notesText}>{client.notes}</Text>
          </Animated.View>
        )}

        {/* Add Payment Button */}
        <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
          <Ionicons name="add-circle" size={24} color={colors.background} />
          <Text style={styles.addButtonText}>Add Payment</Text>
        </TouchableOpacity>

        {/* Payment History */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Payment History</Text>
          {payments.length > 0 ? (
            payments.map((payment, index) => (
              <Animated.View
                key={payment.id}
                entering={FadeInDown.delay(index * 50)}
                style={styles.historyItem}
              >
                <View style={styles.historyLeft}>
                  <Ionicons
                    name={payment.status === 'paid' ? 'checkmark-circle' : 'time'}
                    size={20}
                    color={payment.status === 'paid' ? colors.primary : colors.warning}
                  />
                  <View style={styles.historyTextContainer}>
                    <Text style={styles.historyText}>
                      {payment.status === 'paid' ? `${payment.amount} zł paid` : `Waiting for ${payment.amount} zł`}
                    </Text>
                    {payment.notes && (
                      <Text style={styles.historyNotes}>{payment.notes}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyDate}>
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDeletePayment(payment.id, payment.amount, payment.status)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ))
          ) : (
            <Text style={styles.emptyText}>No payment history</Text>
          )}
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Payment</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title (optional)</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Monthly membership, Personal training..."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Amount Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount (zł)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="150"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            {/* Status Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.statusButtons}>
                <TouchableOpacity
                  style={[styles.statusButton, status === 'paid' && styles.statusButtonActive]}
                  onPress={() => setStatus('paid')}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={status === 'paid' ? colors.background : colors.textSecondary}
                  />
                  <Text
                    style={[styles.statusButtonText, status === 'paid' && styles.statusButtonTextActive]}
                  >
                    Paid
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusButton, status === 'waiting' && styles.statusButtonActive]}
                  onPress={() => setStatus('waiting')}
                >
                  <Ionicons
                    name="time"
                    size={20}
                    color={status === 'waiting' ? colors.background : colors.textSecondary}
                  />
                  <Text
                    style={[styles.statusButtonText, status === 'waiting' && styles.statusButtonTextActive]}
                  >
                    Waiting
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleAddPayment}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Payment'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: colors.textSecondary,
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: colors.textPrimary,
  },
  editButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: colors.primary,
    marginBottom: 8,
  },
  notesSection: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  notesSectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
  },
  notesText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 8,
  },
  addButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.background,
  },
  historySection: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  historyTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  historyTextContainer: {
    flex: 1,
  },
  historyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: colors.textPrimary,
  },
  historyNotes: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  historyDate: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  deleteButton: {
    padding: 4,
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: colors.textPrimary,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    fontFamily: 'Poppins-Regular',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  statusButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusButtonTextActive: {
    color: colors.background,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.background,
  },
});
