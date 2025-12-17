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
import { paymentTrackingService } from '../../services/paymentTrackingService';

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
  status: 'completed' | 'pending';
  payment_date: string;
  notes?: string;
}

const currencyFormatter =
  typeof Intl !== 'undefined'
    ? new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })
    : null;

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value)) return '0 zł';
  if (currencyFormatter) {
    return currencyFormatter.format(value);
  }
  return `${value.toFixed(2)} zł`;
};

export default function ClientDetailScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { clientId } = route.params;

  const [client, setClient] = useState<Client | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);

  // Payment modal
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'completed' | 'pending'>('completed');
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

      const formattedPayments: PaymentRecord[] = (paymentsData || []).map((p: any) => ({
        id: p.id,
        amount: p.amount,
        // Standardize status: 'completed' or 'pending'
        status: p.status === 'completed' || p.payment_type === 'paid' ? 'completed' : 'pending',
        payment_date: p.payment_date,
        notes: p.notes,
      }));

      setPayments(formattedPayments);

      // Calculate totals
      const paid = formattedPayments
        .filter((p) => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);
      setTotalPaid(paid);

      const pending = formattedPayments
        .filter((p) => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0);
      setTotalPending(pending);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    const amountValue = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountValue) || amountValue === 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    try {
      // Save payment with standardized status
      const { error: paymentError } = await supabase.from('payments').insert({
        coach_id: user?.id,
        client_id: clientId,
        amount: Math.abs(amountValue),
        payment_type: 'manual',
        payment_method: 'cash',
        status: status, // 'completed' or 'pending'
        payment_date: new Date().toISOString().split('T')[0],
        notes: title.trim() || null,
      });

      if (paymentError) throw paymentError;

      // Update client's balance_owed
      let newBalance = client?.balance_owed || 0;
      if (status === 'completed') {
        // Payment is complete - reduce any existing balance
        newBalance = Math.max(0, newBalance - Math.abs(amountValue));
        
        // Mark as paid in monthly tracking
        await paymentTrackingService.markClientAsPaid(
          user?.id || '',
          clientId,
          'Payment completed'
        );
      } else {
        // Payment is pending - add to balance (overdue)
        newBalance += Math.abs(amountValue);
        
        // Mark as unpaid in monthly tracking (client has pending payment)
        await paymentTrackingService.markClientAsUnpaid(
          user?.id || '',
          clientId
        );
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
      setStatus('completed');
      fetchData();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePaymentStatus = async (payment: PaymentRecord) => {
    const newStatus = payment.status === 'completed' ? 'pending' : 'completed';
    const actionText = newStatus === 'completed' ? 'Mark as Paid' : 'Mark as Pending';
    
    Alert.alert(
      actionText,
      `Change this payment to "${newStatus === 'completed' ? 'Paid' : 'Waiting'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

              // Update payment status
              const { error: updatePaymentError } = await supabase
                .from('payments')
                .update({ status: newStatus })
                .eq('id', payment.id);

              if (updatePaymentError) throw updatePaymentError;

              // Update client balance
              let newBalance = client?.balance_owed || 0;
              if (newStatus === 'completed') {
                // Marking as paid - reduce balance
                newBalance = Math.max(0, newBalance - payment.amount);
                
                // Mark in monthly tracking
                await paymentTrackingService.markClientAsPaid(
                  user?.id || '',
                  clientId,
                  'Payment status changed to completed'
                );
              } else {
                // Marking as pending - increase balance
                newBalance += payment.amount;
                
                // Mark as unpaid in monthly tracking
                await paymentTrackingService.markClientAsUnpaid(
                  user?.id || '',
                  clientId
                );
              }

              const { error: updateClientError } = await supabase
                .from('clients')
                .update({ balance_owed: newBalance })
                .eq('id', clientId);

              if (updateClientError) throw updateClientError;

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

  const handleDeletePayment = async (paymentId: string, amount: number, paymentStatus: 'completed' | 'pending') => {
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
              if (paymentStatus === 'completed') {
                // Was completed, so we added money - now add back to balance
                newBalance += amount;
              } else {
                // Was pending, so we owed money - remove from balance
                newBalance = Math.max(0, newBalance - amount);
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

  if (loading) {
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{client?.name || 'Client'}</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditClient', { clientId })}
        >
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Animated.View entering={FadeInDown.delay(0)} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Total Paid</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {formatCurrency(totalPaid)}
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100)} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="time" size={24} color={colors.warning} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Balance Owed</Text>
              <Text style={[styles.statValue, { color: colors.warning }]}>
                {formatCurrency(client?.balance_owed || 0)}
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Notes Section */}
        {client?.notes && (
          <Animated.View entering={FadeInDown.delay(150)} style={styles.notesCard}>
            <View style={styles.noteHeader}>
              <Ionicons name="document-text" size={20} color={colors.primary} />
              <Text style={styles.noteTitle}>Trainer Notes</Text>
            </View>
            <Text style={styles.noteText}>{client.notes}</Text>
          </Animated.View>
        )}

        {/* Add Payment Button */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.addPaymentSection}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          <TouchableOpacity
            style={styles.addPaymentButton}
            onPress={() => setShowModal(true)}
          >
            <Ionicons name="add" size={24} color={colors.background} />
          </TouchableOpacity>
        </Animated.View>

        {/* Payments List */}
        {payments.length > 0 ? (
          payments.map((payment, index) => (
            <Animated.View
              key={payment.id}
              entering={FadeInDown.delay(250 + index * 50)}
              style={styles.paymentCard}
            >
              <TouchableOpacity
                style={styles.paymentContent}
                onLongPress={() => handleChangePaymentStatus(payment)}
                delayLongPress={500}
              >
                <View style={[
                  styles.paymentStatus,
                  payment.status === 'completed' 
                    ? styles.paymentStatusPaid 
                    : styles.paymentStatusPending
                ]}>
                  <Ionicons
                    name={payment.status === 'completed' ? 'checkmark' : 'time'}
                    size={16}
                    color={payment.status === 'completed' ? colors.primary : colors.warning}
                  />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentAmount}>
                    {formatCurrency(payment.amount)}
                  </Text>
                  <Text style={styles.paymentDate}>
                    {new Date(payment.payment_date).toLocaleDateString('pl-PL')}
                    {payment.notes && ` • ${payment.notes}`}
                  </Text>
                  <Text style={[
                    styles.paymentStatusText,
                    payment.status === 'completed' 
                      ? styles.paymentStatusTextPaid 
                      : styles.paymentStatusTextPending
                  ]}>
                    {payment.status === 'completed' ? 'Paid' : 'Waiting'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.paymentActions}>
                {/* Quick status toggle button */}
                <TouchableOpacity
                  style={[
                    styles.statusToggleButton,
                    payment.status === 'completed'
                      ? styles.statusToggleCompleted
                      : styles.statusTogglePending
                  ]}
                  onPress={() => handleChangePaymentStatus(payment)}
                >
                  <Ionicons
                    name={payment.status === 'completed' ? 'close' : 'checkmark'}
                    size={18}
                    color={payment.status === 'completed' ? colors.warning : colors.primary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeletePayment(payment.id, payment.amount, payment.status)}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          ))
        ) : (
          <Animated.View entering={FadeInDown.delay(250)} style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No payments yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Tap + to add the first payment
            </Text>
          </Animated.View>
        )}

        {/* Hint for long press */}
        {payments.length > 0 && (
          <View style={styles.hintContainer}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.hintText}>
              Long press on a payment to change its status, or use the toggle button
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Payment Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Payment</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Title (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Monthly payment, etc..."
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>Amount (zł)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="300"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.statusButtons}>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  status === 'completed' && styles.statusButtonActive,
                ]}
                onPress={() => setStatus('completed')}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={status === 'completed' ? colors.background : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.statusButtonText,
                    status === 'completed' && styles.statusButtonTextActive,
                  ]}
                >
                  Paid
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusButton,
                  status === 'pending' && styles.statusButtonPending,
                ]}
                onPress={() => setStatus('pending')}
              >
                <Ionicons
                  name="time"
                  size={20}
                  color={status === 'pending' ? colors.background : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.statusButtonText,
                    status === 'pending' && styles.statusButtonTextActive,
                  ]}
                >
                  Waiting
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAddPayment}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save Payment'}
              </Text>
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
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
  },
  notesCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  noteTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  noteText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  addPaymentSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: colors.textPrimary,
  },
  addPaymentButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentStatus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentStatusPaid: {
    backgroundColor: colors.primary + '20',
  },
  paymentStatusPending: {
    backgroundColor: colors.warning + '20',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  paymentDate: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  paymentStatusText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 11,
    marginTop: 4,
  },
  paymentStatusTextPaid: {
    color: colors.primary,
  },
  paymentStatusTextPending: {
    color: colors.warning,
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusToggleCompleted: {
    backgroundColor: colors.warning + '20',
  },
  statusTogglePending: {
    backgroundColor: colors.primary + '20',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.destructive + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginTop: 8,
  },
  hintText: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: colors.textPrimary,
  },
  inputLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
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
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
  },
  statusButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusButtonPending: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  statusButtonText: {
    fontFamily: 'Poppins-SemiBold',
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
    marginTop: 24,
  },
  saveButtonText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: colors.background,
  },
});
