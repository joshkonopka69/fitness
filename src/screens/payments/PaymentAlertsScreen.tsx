import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import SuccessModal from '../../components/ui/SuccessModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { UnpaidClientsChart } from '../../components/stats/UnpaidClientsChart';
import { PaymentChartData, PaymentChartViewMode } from '../../types/paymentTracking';
import { paymentTrackingService } from '../../services/paymentTrackingService';

const { width } = Dimensions.get('window');
const GRAPH_WIDTH = width - 96; // Leave space for Y-axis labels
const GRAPH_HEIGHT = 180;
const Y_AXIS_WIDTH = 48;

interface Payment {
  id: string;
  amount: number;
  payment_type: string;
  payment_date: string;
  client_id: string;
  status: string;
  client_name?: string;
}

interface Client {
  id: string;
  name: string;
  balance_owed: number;
}

interface PendingPayment {
  id: string;
  amount: number;
  client_id: string;
  client_name: string;
  payment_date: string;
}

interface DailyRevenue {
  date: string;
  amount: number;
}

const currencyFormatter =
  typeof Intl !== 'undefined'
    ? new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })
    : null;

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value)) return '0 PLN';
  if (currencyFormatter) {
    return currencyFormatter.format(value);
  }

  return `${value.toFixed(2)} PLN`;
};

export default function PaymentAlertsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalOverdue, setTotalOverdue] = useState(0);
  const [overdueClients, setOverdueClients] = useState<Client[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [revenueData, setRevenueData] = useState<DailyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentsTableMissing, setPaymentsTableMissing] = useState(false);

  // Add payment modals
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showAddOverdueModal, setShowAddOverdueModal] = useState(false);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [clientSelectorMode, setClientSelectorMode] = useState<'payment' | 'overdue'>('payment');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Success modals
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
  const [showOverdueSuccessModal, setShowOverdueSuccessModal] = useState(false);
  const [showMarkPaidSuccessModal, setShowMarkPaidSuccessModal] = useState(false);

  // Payment Tracking State
  const [paymentChartData, setPaymentChartData] = useState<PaymentChartData[]>([]);
  const [paymentViewMode, setPaymentViewMode] = useState<PaymentChartViewMode>('categories');
  const [selectedCategoryForPayment, setSelectedCategoryForPayment] = useState<{ id: string; label: string } | null>(null);
  const [selectedSubcategoryForPayment, setSelectedSubcategoryForPayment] = useState<{ id: string; label: string } | null>(null);
  const [paymentChartLevel, setPaymentChartLevel] = useState<'categories' | 'subcategories' | 'clients'>('categories');
  const [paymentBreadcrumb, setPaymentBreadcrumb] = useState<string | null>(null);
  const [loadingPaymentData, setLoadingPaymentData] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchData();
        fetchAllClients();
        fetchPaymentData();
      }
    }, [user])
  );

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchPaymentData();
      }
    }, [paymentViewMode, selectedCategoryForPayment, selectedSubcategoryForPayment])
  );

  const fetchAllClients = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, balance_owed')
        .eq('coach_id', user.id)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch all completed payments (for Total Collected)
      const { data: paidPayments, error: paidError } = await supabase
        .from('payments')
        .select('amount, payment_date')
        .eq('coach_id', user.id)
        .eq('status', 'completed');

      if (paidError) {
        const msg = String((paidError as any)?.message || '');
        if (msg.includes("Could not find the table 'public.payments'") || 
            msg.includes("in the schema cache")) {
          setPaymentsTableMissing(true);
          setTotalCollected(0);
          setRevenueData([]);
          setPendingPayments([]);
        } else {
          throw paidError;
        }
      } else {
        setPaymentsTableMissing(false);

        const collected = (paidPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
        setTotalCollected(collected);

        // Calculate revenue for last 14 days
        const last14Days: DailyRevenue[] = [];
        const today = new Date();

        for (let i = 13; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          const dayRevenue = (paidPayments || [])
            .filter((p) => {
              const paymentDate = new Date(p.payment_date).toISOString().split('T')[0];
              return paymentDate === dateStr;
            })
            .reduce((sum, p) => sum + Number(p.amount || 0), 0);

          last14Days.push({
            date: dateStr,
            amount: dayRevenue,
          });
        }

        setRevenueData(last14Days);
      }

      // Fetch pending payments (for Overdue section)
      const { data: pendingData, error: pendingError } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          client_id,
          payment_date,
          clients!inner(name)
        `)
        .eq('coach_id', user.id)
        .eq('status', 'pending')
        .order('payment_date', { ascending: false });

      if (!pendingError && pendingData) {
        const formattedPending: PendingPayment[] = pendingData.map((p: any) => ({
          id: p.id,
          amount: p.amount,
          client_id: p.client_id,
          client_name: p.clients?.name || 'Unknown',
          payment_date: p.payment_date,
        }));
        setPendingPayments(formattedPending);
      }

      // Fetch clients with balance owed
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, balance_owed')
        .eq('coach_id', user.id)
        .gt('balance_owed', 0)
        .order('balance_owed', { ascending: false });

      if (clientsError) throw clientsError;

      setOverdueClients(clientsData || []);

      // Calculate total overdue: balance_owed from clients + pending payments
      const clientsOverdue = (clientsData || []).reduce((sum, c) => sum + Number(c.balance_owed || 0), 0);
      const pendingOverdue = (pendingData || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      setTotalOverdue(clientsOverdue + pendingOverdue);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentData = async () => {
    if (!user) return;

    setLoadingPaymentData(true);
    try {
      // Get all clients with their balance_owed for money display
      const { data: allClientsData } = await supabase
        .from('clients')
        .select('id, name, balance_owed')
        .eq('coach_id', user.id);
      
      const clientBalanceMap = new Map<string, number>();
      const clientNameMap = new Map<string, string>();
      (allClientsData || []).forEach(c => {
        clientBalanceMap.set(c.id, c.balance_owed || 0);
        clientNameMap.set(c.id, c.name);
      });

      if (paymentViewMode === 'categories') {
        if (selectedSubcategoryForPayment) {
          setPaymentChartLevel('clients');
          setPaymentBreadcrumb(
            selectedCategoryForPayment
              ? `${selectedCategoryForPayment.label} > ${selectedSubcategoryForPayment.label}`
              : selectedSubcategoryForPayment.label
          );

          const { data: unpaidInSubcategory, error } = 
            await paymentTrackingService.getUnpaidClientsInCategory(
              user.id, 
              selectedSubcategoryForPayment.id
            );

          if (error) throw error;

          // Show actual money owed, not just count
          const chartData: PaymentChartData[] = (unpaidInSubcategory || []).map(client => ({
            id: client.client_id,
            label: client.client_name,
            value: clientBalanceMap.get(client.client_id) || 0,
            color: colors.primary,
            type: 'client' as const,
            parentId: selectedSubcategoryForPayment.id,
          })).filter(c => c.value > 0); // Only show clients who actually owe money

          setPaymentChartData(chartData);
        } else if (selectedCategoryForPayment) {
          setPaymentBreadcrumb(selectedCategoryForPayment.label);

          // Special handling for "Bez kategorii" (uncategorized clients)
          if (selectedCategoryForPayment.id === 'uncategorized') {
            setPaymentChartLevel('clients');
            
            // Get clients without categories who owe money
            const { data: clientsWithCategories } = await supabase
              .from('client_categories')
              .select('client_id');
            
            const clientIdsWithCategories = new Set((clientsWithCategories || []).map(cc => cc.client_id));
            
            const chartData: PaymentChartData[] = (allClientsData || [])
              .filter(c => !clientIdsWithCategories.has(c.id) && (c.balance_owed || 0) > 0)
              .map(client => ({
                id: client.id,
                label: client.name,
                value: client.balance_owed || 0,
                color: colors.primary,
                type: 'client' as const,
                parentId: 'uncategorized',
              }))
              .sort((a, b) => b.value - a.value);

            setPaymentChartData(chartData);
          } else {
            // Normal category handling
            const { data: subcategoryStats, error } = 
              await paymentTrackingService.getPaymentStatsBySubcategory(user.id, selectedCategoryForPayment.id);

            if (error) throw error;

            // Calculate total money owed per subcategory
            const subcategoryChart: PaymentChartData[] = [];
            
            for (const sub of (subcategoryStats || []).filter(s => s.unpaid_clients > 0)) {
              // Get clients in this subcategory to sum their balances
              const { data: clientsInSub } = await paymentTrackingService.getUnpaidClientsInCategory(
                user.id, 
                sub.subcategory_id
              );
              
              const totalOwed = (clientsInSub || []).reduce((sum, c) => {
                return sum + (clientBalanceMap.get(c.client_id) || 0);
              }, 0);

              if (totalOwed > 0) {
                subcategoryChart.push({
                  id: sub.subcategory_id,
                  label: sub.subcategory_name,
                  value: totalOwed,
                  color: sub.color,
                  icon: sub.icon,
                  type: 'subcategory',
                  parentId: selectedCategoryForPayment.id,
                });
              }
            }

            if (subcategoryChart.length > 0) {
              setPaymentChartLevel('subcategories');
              setPaymentChartData(subcategoryChart);
            } else {
              setPaymentChartLevel('clients');

              const { data: unpaidInCategory, error: unpaidError } = 
                await paymentTrackingService.getUnpaidClientsInCategory(
                  user.id, 
                  selectedCategoryForPayment.id
                );

              if (unpaidError) throw unpaidError;

              const chartData: PaymentChartData[] = (unpaidInCategory || []).map(client => ({
                id: client.client_id,
                label: client.client_name,
                value: clientBalanceMap.get(client.client_id) || 0,
                color: colors.primary,
                type: 'client' as const,
                parentId: selectedCategoryForPayment.id,
              })).filter(c => c.value > 0);

              setPaymentChartData(chartData);
            }
          }
        } else {
          setPaymentBreadcrumb(null);
          setPaymentChartLevel('categories');

          const { data: categoryStats, error } = 
            await paymentTrackingService.getPaymentStatsByCategory(user.id);

          if (error) throw error;

          // Calculate total money owed per category
          const chartDataPromises = (categoryStats || [])
            .filter(cat => cat.unpaid_clients > 0)
            .map(async cat => {
              const { data: clientsInCat } = await paymentTrackingService.getUnpaidClientsInCategory(
                user.id,
                cat.category_id
              );
              
              const totalOwed = (clientsInCat || []).reduce((sum, c) => {
                return sum + (clientBalanceMap.get(c.client_id) || 0);
              }, 0);

              return {
                id: cat.category_id,
                label: cat.category_name,
                value: totalOwed,
                color: cat.color,
                icon: cat.icon,
                type: 'category' as const,
              };
            });

          const chartData = (await Promise.all(chartDataPromises)).filter(c => c.value > 0);
          
          // Add uncategorized clients ("Bez kategorii") - clients with no categories who owe money
          const { data: clientsWithCategories } = await supabase
            .from('client_categories')
            .select('client_id');
          
          const clientIdsWithCategories = new Set((clientsWithCategories || []).map(cc => cc.client_id));
          
          const uncategorizedOwed = (allClientsData || [])
            .filter(c => !clientIdsWithCategories.has(c.id) && (c.balance_owed || 0) > 0)
            .reduce((sum, c) => sum + (c.balance_owed || 0), 0);
          
          if (uncategorizedOwed > 0) {
            chartData.push({
              id: 'uncategorized',
              label: 'Bez kategorii',
              value: uncategorizedOwed,
              color: colors.textSecondary,
              icon: 'help-circle-outline',
              type: 'category' as const,
            });
          }

          setPaymentChartData(chartData);
        }
      } else {
        // "Individuals" view - show ALL clients with balance_owed > 0
        // This includes clients without categories ("Wszystkie")
        setPaymentBreadcrumb(null);
        setPaymentChartLevel('clients');

        // Use allClientsData to show everyone who owes money
        const chartData: PaymentChartData[] = (allClientsData || [])
          .filter(c => (c.balance_owed || 0) > 0)
          .map(client => ({
            id: client.id,
            label: client.name,
            value: client.balance_owed || 0,
            color: colors.primary,
            type: 'client' as const,
          }))
          .sort((a, b) => b.value - a.value); // Sort by highest debt first

        setPaymentChartData(chartData);
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoadingPaymentData(false);
    }
  };

  const handlePaymentBarPress = (item: PaymentChartData) => {
    if (paymentViewMode !== 'categories') {
      return;
    }

    if (!selectedCategoryForPayment && paymentChartLevel === 'categories') {
      setSelectedCategoryForPayment({ id: item.id, label: item.label });
      setSelectedSubcategoryForPayment(null);
    } else if (selectedCategoryForPayment && paymentChartLevel === 'subcategories') {
      setSelectedSubcategoryForPayment({ id: item.id, label: item.label });
    }
  };

  const handlePaymentViewModeChange = (mode: PaymentChartViewMode) => {
    setPaymentViewMode(mode);
    if (mode !== 'categories') {
      setSelectedCategoryForPayment(null);
      setSelectedSubcategoryForPayment(null);
    }
    setPaymentBreadcrumb(null);
  };

  const handlePaymentBackPress = () => {
    if (selectedSubcategoryForPayment) {
      setSelectedSubcategoryForPayment(null);
    } else if (selectedCategoryForPayment) {
      setSelectedCategoryForPayment(null);
    }
  };

  const handleAddPayment = async () => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!selectedClient || !amount) {
      Alert.alert('Error', 'Please select a client and enter an amount');
      return;
    }

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount greater than 0');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const paymentDate = new Date().toISOString().split('T')[0];
      const clientRecord = clients.find((c) => c.id === selectedClient);
      const updatedBalance = Math.max((clientRecord?.balance_owed || 0) - parsedAmount, 0);
      
      const { error } = await supabase.from('payments').insert({
        coach_id: user.id,
        client_id: selectedClient,
        amount: parsedAmount,
        payment_type: 'manual',
        payment_method: 'cash',
        status: 'completed',
        payment_date: paymentDate,
      });

      if (error) throw error;

      const { error: updateClientError } = await supabase
        .from('clients')
        .update({ balance_owed: updatedBalance })
        .eq('id', selectedClient)
        .eq('coach_id', user.id);

      if (updateClientError) throw updateClientError;

      // Keep monthly tracking in sync (used by Clients screen)
      const { error: trackingError } = await paymentTrackingService.markClientAsPaid(
        user.id,
        selectedClient,
        'Manual payment'
      );
      if (trackingError) {
        console.warn('Failed to mark client as paid in monthly tracking:', trackingError);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddPaymentModal(false);
      setSelectedClient('');
      setAmount('');
      setShowPaymentSuccessModal(true);
      fetchData();
      fetchPaymentData();
      fetchAllClients();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message);
    }
  };

  const handleAddOverdue = async () => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!selectedClient || !amount) {
      Alert.alert('Error', 'Please select a client and enter an amount');
      return;
    }

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount greater than 0');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const client = clients.find((c: Client) => c.id === selectedClient);
      const newBalance = (client?.balance_owed || 0) + parsedAmount;

      const { error } = await supabase
        .from('clients')
        .update({ balance_owed: newBalance })
        .eq('id', selectedClient)
        .eq('coach_id', user.id);

      if (error) throw error;

      // Mark client as unpaid in monthly tracking (they owe money)
      await paymentTrackingService.markClientAsUnpaid(user.id, selectedClient);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddOverdueModal(false);
      setSelectedClient('');
      setAmount('');
      setShowOverdueSuccessModal(true);
      fetchData();
      fetchAllClients();
      fetchPaymentData();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message);
    }
  };

  const handleMarkPaid = async (clientId: string, clientName: string, amount: number) => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    Alert.alert(
      'Mark as Paid',
      `Mark ${clientName} as paid (${formatCurrency(amount)})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              
              const paymentDate = new Date().toISOString().split('T')[0];
              const { error: paymentError } = await supabase.from('payments').insert({
                coach_id: user.id,
                client_id: clientId,
                amount,
                payment_type: 'manual',
                payment_method: 'cash',
                status: 'completed',
                payment_date: paymentDate,
              });

              if (paymentError) throw paymentError;

              const { error: updateError } = await supabase
                .from('clients')
                .update({ balance_owed: 0 })
                .eq('id', clientId)
                .eq('coach_id', user.id);

              if (updateError) throw updateError;

              const { error: trackingError } = await paymentTrackingService.markClientAsPaid(
                user.id,
                clientId,
                'Marked paid'
              );
              if (trackingError) {
                console.warn('Failed to mark client as paid in monthly tracking:', trackingError);
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setShowMarkPaidSuccessModal(true);
              fetchData();
              fetchPaymentData();
              fetchAllClients();
            } catch (error: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  // Mark a pending payment as completed
  const handleMarkPendingAsPaid = async (payment: PendingPayment) => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    Alert.alert(
      'Mark as Paid',
      `Mark ${payment.client_name}'s payment of ${formatCurrency(payment.amount)} as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

              // Update payment status from pending to completed
              const { error: paymentError } = await supabase
                .from('payments')
                .update({ status: 'completed' })
                .eq('id', payment.id);

              if (paymentError) throw paymentError;

              // Reduce client's balance_owed
              const { data: clientData } = await supabase
                .from('clients')
                .select('balance_owed')
                .eq('id', payment.client_id)
                .single();

              if (clientData) {
                const newBalance = Math.max(0, (clientData.balance_owed || 0) - payment.amount);
                await supabase
                  .from('clients')
                  .update({ balance_owed: newBalance })
                  .eq('id', payment.client_id);
              }

              // Mark in monthly tracking
              await paymentTrackingService.markClientAsPaid(
                user.id,
                payment.client_id,
                'Pending payment completed'
              );

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setShowMarkPaidSuccessModal(true);
              fetchData();
              fetchPaymentData();
              fetchAllClients();
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

  const maxRevenue = Math.max(...revenueData.map((d: DailyRevenue) => d.amount), 100);
  const bestDayAmount = revenueData.reduce(
    (maxValue: number, entry: DailyRevenue) => Math.max(maxValue, entry.amount),
    0
  );

  const dismissKeyboard = () => Keyboard.dismiss();

  return (
    <Pressable style={styles.container} onPress={dismissKeyboard}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Payments</Text>
          <Text style={styles.subtitle}>Track your revenue</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowPaymentOptions(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={colors.background} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Animated.View entering={FadeInDown.delay(0)} style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="cash" size={28} color={colors.primary} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Total Collected</Text>
              <Text style={styles.statValue}>{formatCurrency(totalCollected)}</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100)} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="time" size={28} color={colors.warning} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Overdue</Text>
              <Text style={[styles.statValue, { color: colors.warning }]}>
                {formatCurrency(totalOverdue)}
          </Text>
            </View>
          </Animated.View>
        </View>

        {/* Revenue Graph */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.graphCard}>
          <Text style={styles.graphTitle}>Revenue (Last 2 Weeks)</Text>

          {paymentsTableMissing && (
            <View style={styles.dbWarning}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
              <Text style={styles.dbWarningText}>
                Payments table is missing in Supabase. Run the SQL setup scripts (see `database/`) and reload the app.
              </Text>
            </View>
          )}

          <View style={styles.graphContainer}>
            <Svg width={GRAPH_WIDTH + Y_AXIS_WIDTH} height={GRAPH_HEIGHT} style={styles.graph}>
              {/* Y-axis labels and grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((fraction: number, index: number) => {
                const yPos = GRAPH_HEIGHT - 30 - (fraction * (GRAPH_HEIGHT - 40));
                const value = Math.round(maxRevenue * fraction);
                
                return (
                  <G key={`axis-${index}`}>
                    {/* Grid line */}
                    <Line
                      x1={Y_AXIS_WIDTH}
                      y1={yPos}
                      x2={GRAPH_WIDTH + Y_AXIS_WIDTH}
                      y2={yPos}
                      stroke={colors.border}
                      strokeWidth="1"
                      strokeDasharray="4,4"
                    />
                    {/* Y-axis label */}
                    <SvgText
                      x={Y_AXIS_WIDTH - 8}
                      y={yPos + 4}
                      fill={colors.textSecondary}
                      fontSize="10"
                      fontFamily="Poppins-Regular"
                      textAnchor="end"
                    >
                      {formatCurrency(value)}
                    </SvgText>
                  </G>
                );
              })}
              
              {/* Revenue bars */}
              {revenueData.map((item: DailyRevenue, index: number) => {
                const barHeight = (item.amount / (maxRevenue || 1)) * (GRAPH_HEIGHT - 40);
                const barWidth = (GRAPH_WIDTH / revenueData.length) - 6;
                const x = Y_AXIS_WIDTH + index * (barWidth + 6);
                const y = GRAPH_HEIGHT - 30 - barHeight;

                return (
                  <G key={`bar-${index}`}>
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight || 2}
                    fill={colors.primary}
                    rx={4}
                  />
                  </G>
                );
              })}
            </Svg>
          </View>

          <View style={styles.graphLabels}>
            <Text style={styles.graphLabel}>
              {new Date(revenueData[0]?.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
            <Text style={styles.graphLabel}>
              {new Date(revenueData[revenueData.length - 1]?.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>

          {maxRevenue > 0 && (
            <Text style={styles.graphBest}>
              Best day: {formatCurrency(bestDayAmount)}
            </Text>
          )}
        </Animated.View>

        {/* Unpaid Clients This Month */}
        <Animated.View entering={FadeInDown.delay(250)} style={styles.graphCard}>
          <Text style={styles.graphTitle}>Unpaid Clients This Month</Text>
          <UnpaidClientsChart
            data={paymentChartData}
            viewMode={paymentViewMode}
            onViewModeChange={handlePaymentViewModeChange}
            onBarPress={handlePaymentBarPress}
            loading={loadingPaymentData}
            selectedCategory={
              selectedSubcategoryForPayment?.id ||
              selectedCategoryForPayment?.id ||
              null
            }
            onBackPress={handlePaymentBackPress}
            level={paymentChartLevel}
            breadcrumbLabel={paymentBreadcrumb}
          />
        </Animated.View>

        {/* Pending Payments - Show first as these are awaiting confirmation */}
        {pendingPayments.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.overdueSection}>
            <View style={styles.overdueSectionHeader}>
              <View style={styles.overdueTitleRow}>
                <Ionicons name="time" size={20} color={colors.warning} />
                <Text style={styles.overdueSectionTitle}>Pending Payments</Text>
              </View>
              <Text style={styles.overdueCount}>{pendingPayments.length} waiting</Text>
            </View>

            {pendingPayments.map((payment: PendingPayment, index: number) => (
              <Animated.View
                key={payment.id}
                entering={FadeInDown.delay(350 + index * 50)}
                style={[styles.overdueCard, styles.pendingCard]}
              >
                <View style={styles.overdueLeft}>
                  <View style={[styles.overdueAvatar, styles.pendingAvatar]}>
                    <Text style={styles.overdueAvatarText}>
                      {payment.client_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.overdueName}>{payment.client_name}</Text>
                    <Text style={styles.overdueAmount}>{formatCurrency(payment.amount)}</Text>
                    <Text style={styles.pendingDate}>
                      {new Date(payment.payment_date).toLocaleDateString('pl-PL')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.markPaidButton}
                  onPress={() => handleMarkPendingAsPaid(payment)}
                >
                  <Text style={styles.markPaidButtonText}>Confirm Paid</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {/* Overdue Clients - Balance owed */}
        {overdueClients.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.overdueSection}>
            <View style={styles.overdueSectionHeader}>
              <View style={styles.overdueTitleRow}>
                <Ionicons name="alert-circle" size={20} color={colors.destructive} />
                <Text style={styles.overdueSectionTitle}>Balance Owed</Text>
              </View>
              <Text style={styles.overdueCount}>{overdueClients.length} clients</Text>
            </View>

            {overdueClients.map((client: Client, index: number) => (
              <Animated.View
                key={client.id}
                entering={FadeInDown.delay(350 + index * 50)}
                style={styles.overdueCard}
              >
                <View style={styles.overdueLeft}>
                  <View style={styles.overdueAvatar}>
                    <Text style={styles.overdueAvatarText}>
                      {client.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.overdueName}>{client.name}</Text>
                    <Text style={styles.overdueAmount}>{formatCurrency(client.balance_owed)}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.markPaidButton}
                  onPress={() => handleMarkPaid(client.id, client.name, client.balance_owed)}
                >
                  <Text style={styles.markPaidButtonText}>Mark Paid</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {/* Empty State */}
        {overdueClients.length === 0 && totalCollected === 0 && (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.emptyState}>
            <Ionicons name="card-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No payment data yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Record your first payment to see stats
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Payment Options Modal */}
      <Modal
        visible={showPaymentOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPaymentOptions(false)}
        >
          <View style={styles.paymentOptionsModal}>
            <Text style={styles.modalTitle}>Add Payment</Text>
            
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setShowPaymentOptions(false);
                setTimeout(() => setShowAddPaymentModal(true), 300);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="cash" size={24} color={colors.primary} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Add Payment</Text>
                <Text style={styles.optionSubtitle}>Record a payment received</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setShowPaymentOptions(false);
                setTimeout(() => setShowAddOverdueModal(true), 300);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.optionIcon, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="time" size={24} color={colors.warning} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Add Overdue</Text>
                <Text style={styles.optionSubtitle}>Add amount owed by client</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowPaymentOptions(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Payment Modal */}
      <Modal
        visible={showAddPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddPaymentModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable style={styles.modalOverlay} onPress={dismissKeyboard}>
            <Pressable style={styles.formModal}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Add Payment</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddPaymentModal(false);
                  setSelectedClient('');
                  setAmount('');
                }}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>Select Client</Text>
            <TouchableOpacity
              style={styles.modernPicker}
              onPress={() => {
                  dismissKeyboard();
                setClientSelectorMode('payment');
                setSearchQuery('');
                setShowClientSelector(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.pickerIconContainer}>
                <Ionicons name="person" size={22} color={selectedClient ? colors.primary : colors.textSecondary} />
              </View>
              <Text style={selectedClient ? styles.pickerTextSelected : styles.pickerPlaceholder}>
                  {selectedClient ? clients.find((c: Client) => c.id === selectedClient)?.name : 'Choose client...'}
              </Text>
              <Ionicons name="chevron-down-circle" size={24} color={colors.primary} />
            </TouchableOpacity>

              <Text style={styles.formLabel}>Amount (PLN)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="cash" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                  returnKeyType="done"
                  onSubmitEditing={dismissKeyboard}
              />
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleAddPayment}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>Add Payment</Text>
            </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Overdue Modal */}
      <Modal
        visible={showAddOverdueModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddOverdueModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable style={styles.modalOverlay} onPress={dismissKeyboard}>
            <Pressable style={styles.formModal}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Add Overdue</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddOverdueModal(false);
                  setSelectedClient('');
                  setAmount('');
                }}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>Select Client</Text>
            <TouchableOpacity
              style={styles.modernPicker}
              onPress={() => {
                  dismissKeyboard();
                setClientSelectorMode('overdue');
                setSearchQuery('');
                setShowClientSelector(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.pickerIconContainer}>
                <Ionicons name="person" size={22} color={selectedClient ? colors.primary : colors.textSecondary} />
              </View>
              <Text style={selectedClient ? styles.pickerTextSelected : styles.pickerPlaceholder}>
                  {selectedClient ? clients.find((c: Client) => c.id === selectedClient)?.name : 'Choose client...'}
              </Text>
              <Ionicons name="chevron-down-circle" size={24} color={colors.primary} />
            </TouchableOpacity>

              <Text style={styles.formLabel}>Amount (PLN)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="time" size={20} color={colors.warning} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                  returnKeyType="done"
                  onSubmitEditing={dismissKeyboard}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.warning }]}
              onPress={handleAddOverdue}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>Add Overdue</Text>
            </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Client Selector Modal */}
      <Modal
        visible={showClientSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowClientSelector(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowClientSelector(false)}>
            <Pressable style={styles.clientSelectorModal}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Select Client</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowClientSelector(false);
                  setSearchQuery('');
                }}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.clientSelectorSubtitle}>
              {clientSelectorMode === 'payment' 
                ? 'Choose a client to add payment'
                : 'Choose a client to add overdue amount'}
            </Text>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search clients..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                  autoFocus={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Client List */}
            <ScrollView 
              style={styles.clientList} 
              showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="on-drag"
            >
              {clients
                  .filter((client: Client) => 
                  client.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                  .map((client: Client) => (
                  <TouchableOpacity
                    key={client.id}
                    style={[
                      styles.clientSelectorItem,
                      selectedClient === client.id && styles.clientSelectorItemSelected
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedClient(client.id);
                      setShowClientSelector(false);
                      setSearchQuery('');
                        dismissKeyboard();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.clientSelectorAvatar}>
                      <Text style={styles.clientSelectorAvatarText}>
                        {client.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.clientSelectorInfo}>
                      <Text style={styles.clientSelectorName}>{client.name}</Text>
                      <Text style={styles.clientSelectorBalance}>
                          Balance: {formatCurrency(client.balance_owed || 0)}
                      </Text>
                    </View>
                    {selectedClient === client.id && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              
                {clients.filter((client: Client) => 
                client.name.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 && (
                <View style={styles.emptySearchState}>
                  <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptySearchText}>No clients found</Text>
                  <Text style={styles.emptySearchSubtext}>
                    {searchQuery ? 'Try a different search' : 'Add clients to get started'}
                  </Text>
                </View>
              )}
            </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Success Modals */}
      <SuccessModal
        visible={showPaymentSuccessModal}
        message="Payment added successfully!"
        onClose={() => setShowPaymentSuccessModal(false)}
      />
      <SuccessModal
        visible={showOverdueSuccessModal}
        message="Overdue amount added successfully!"
        onClose={() => setShowOverdueSuccessModal(false)}
      />
      <SuccessModal
        visible={showMarkPaidSuccessModal}
        message="Payment marked as paid!"
        onClose={() => setShowMarkPaidSuccessModal(false)}
      />
    </Pressable>
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
    paddingTop: 56,
    paddingBottom: 16,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: colors.primary,
  },
  graphCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  graphTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  dbWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.warning + '15',
    borderWidth: 1,
    borderColor: colors.warning + '35',
    marginBottom: 12,
  },
  dbWarningText: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  graphContainer: {
    alignItems: 'center',
  },
  graph: {
    marginBottom: 8,
  },
  graphLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  graphLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    color: colors.textSecondary,
  },
  graphBest: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: colors.primary,
    textAlign: 'center',
    marginTop: 8,
  },
  overdueSection: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  overdueSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overdueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overdueSectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: colors.textPrimary,
  },
  overdueCount: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
  overdueCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingCard: {
    borderColor: colors.warning + '50',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  pendingAvatar: {
    backgroundColor: colors.warning + '30',
  },
  pendingDate: {
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overdueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  overdueAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.warning + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueAvatarText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: colors.warning,
  },
  overdueName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  overdueAmount: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.warning,
  },
  markPaidButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  markPaidButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
    color: colors.background,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  paymentOptionsModal: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  optionSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: colors.textSecondary,
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  formModal: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  formTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: colors.textPrimary,
  },
  formLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  modernPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 20,
    gap: 12,
  },
  pickerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    color: colors.textPrimary,
  },
  pickerTextSelected: {
    flex: 1,
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  pickerPlaceholder: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    color: colors.textPrimary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    alignItems: 'center',
  },
  submitButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.background,
  },
  // Client Selector Modal Styles
  clientSelectorModal: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  clientSelectorSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    color: colors.textPrimary,
  },
  clientList: {
    maxHeight: 400,
  },
  clientSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.border,
    gap: 12,
  },
  clientSelectorItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  clientSelectorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientSelectorAvatarText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: colors.primary,
  },
  clientSelectorInfo: {
    flex: 1,
  },
  clientSelectorName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  clientSelectorBalance: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptySearchState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptySearchText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySearchSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
