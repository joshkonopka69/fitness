import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Alert,
} from 'react-native';
import Animated, { FadeInLeft, FadeInUp } from 'react-native-reanimated';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { LoadingState } from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { CoachStats, MembershipDistribution, statsService, WeeklyData } from '../../services/statsService';
import { colors } from '../../theme/colors';
import { UnpaidClientsChart } from '../../components/stats/UnpaidClientsChart';
import { 
  PaymentChartData, 
  PaymentChartViewMode, 
  PaymentStatsByCategory 
} from '../../types/paymentTracking';
import { paymentTrackingService } from '../../services/paymentTrackingService';
import { categoryService } from '../../services/categoryService';

const { width } = Dimensions.get('window');

export default function StatsScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<CoachStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [membershipData, setMembershipData] = useState<MembershipDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Payment Tracking State
  const [paymentChartData, setPaymentChartData] = useState<PaymentChartData[]>([]);
  const [paymentViewMode, setPaymentViewMode] = useState<PaymentChartViewMode>('categories');
  const [selectedCategoryForPayment, setSelectedCategoryForPayment] = useState<string | null>(null);
  const [loadingPaymentData, setLoadingPaymentData] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
      fetchPaymentData();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPaymentData();
    }
  }, [paymentViewMode, selectedCategoryForPayment, user]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [statsData, weekly, membership] = await Promise.all([
        statsService.getCoachStats(user.id),
        statsService.getWeeklyAttendanceData(user.id),
        statsService.getMembershipDistribution(user.id),
      ]);

      setStats(statsData);
      setWeeklyData(weekly);
      setMembershipData(membership);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentData = async () => {
    if (!user) return;

    setLoadingPaymentData(true);
    try {
      if (selectedCategoryForPayment) {
        // Pokazuj klientów z wybranej kategorii
        const { data: unpaidInCategory, error } = 
          await paymentTrackingService.getUnpaidClientsInCategory(
            user.id, 
            selectedCategoryForPayment
          );

        if (error) throw error;

        const chartData: PaymentChartData[] = (unpaidInCategory || []).map(client => ({
          id: client.client_id,
          label: client.client_name,
          value: 1, // każdy klient = 1
          color: colors.primary,
        }));

        setPaymentChartData(chartData);
      } else if (paymentViewMode === 'categories') {
        // Pokazuj kategorie z liczbą nieopłaconych
        const { data: categoryStats, error } = 
          await paymentTrackingService.getPaymentStatsByCategory(user.id);

        if (error) throw error;

        const chartData: PaymentChartData[] = (categoryStats || [])
          .filter(cat => cat.unpaid_clients > 0)
          .map(cat => ({
            id: cat.category_id,
            label: cat.category_name,
            value: cat.unpaid_clients,
            color: cat.color,
            icon: cat.icon,
          }));

        setPaymentChartData(chartData);
      } else {
        // Pokazuj wszystkich nieopłaconych klientów (bez kategorii + wszystkie z kategorii)
        const { data: unpaidClients, error } = 
          await paymentTrackingService.getUnpaidClientsCurrentMonth(user.id);

        if (error) throw error;

        const chartData: PaymentChartData[] = (unpaidClients || []).map(client => ({
          id: client.client_id,
          label: client.client_name,
          value: 1,
          color: colors.primary,
        }));

        setPaymentChartData(chartData);
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
      Alert.alert('Błąd', 'Nie udało się pobrać danych o płatnościach');
    } finally {
      setLoadingPaymentData(false);
    }
  };

  const handlePaymentBarPress = (item: PaymentChartData) => {
    if (paymentViewMode === 'categories') {
      // Kliknięto kategorię → pokaż klientów z tej kategorii
      setSelectedCategoryForPayment(item.id);
    } else {
      // Kliknięto klienta → nie rób nic (można dodać szczegóły klienta)
      console.log('Clicked client:', item.label);
    }
  };

  const handlePaymentViewModeChange = (mode: PaymentChartViewMode) => {
    setPaymentViewMode(mode);
    setSelectedCategoryForPayment(null); // Reset wybranej kategorii
  };

  const handlePaymentBackPress = () => {
    setSelectedCategoryForPayment(null);
  };

  if (loading) {
    return <LoadingState message="Loading statistics..." />;
  }

  if (!stats) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load statistics</Text>
      </View>
    );
  }

  const maxAttendance = Math.max(...weeklyData.map((d) => d.attendance), 1);

  const statsCards = [
    {
      title: 'Total Clients',
      value: stats.totalClients.toString(),
      icon: 'people',
      color: colors.primary,
      bgColor: `${colors.primary}10`,
    },
    {
      title: 'Active Members',
      value: stats.activeClients.toString(),
      icon: 'trending-up',
      color: colors.secondary,
      bgColor: `${colors.secondary}10`,
    },
    {
      title: 'Avg Attendance',
      value: `${stats.avgAttendanceRate}%`,
      icon: 'bar-chart',
      color: '#8B5CF6',
      bgColor: '#8B5CF610',
    },
    {
      title: 'Monthly Revenue',
      value: `$${stats.monthlyRevenue}`,
      icon: 'trophy',
      color: '#F59E0B',
      bgColor: '#F59E0B10',
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Statistics</Text>
        <Text style={styles.subtitle}>Track your gym's performance</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {statsCards.map((stat, index) => (
          <Animated.View
            key={stat.title}
            entering={FadeInUp.delay(index * 100).springify()}
            style={styles.statCard}
          >
            <View style={[styles.statIcon, { backgroundColor: stat.bgColor }]}>
              <Ionicons name={stat.icon as any} size={20} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statTitle}>{stat.title}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Unpaid Clients This Month */}
      <Animated.View entering={FadeInUp.delay(350)}>
        <Card style={styles.card}>
          <CardHeader>
            <View style={styles.cardTitleRow}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <CardTitle>Nieopłaceni Klienci</CardTitle>
            </View>
          </CardHeader>
          <CardContent>
            <UnpaidClientsChart
              data={paymentChartData}
              viewMode={paymentViewMode}
              onViewModeChange={handlePaymentViewModeChange}
              onBarPress={handlePaymentBarPress}
              loading={loadingPaymentData}
              selectedCategory={selectedCategoryForPayment}
              onBackPress={handlePaymentBackPress}
            />
          </CardContent>
        </Card>
      </Animated.View>

      {/* Weekly Attendance */}
      <Animated.View entering={FadeInUp.delay(400)}>
        <Card style={styles.card}>
          <CardHeader>
            <View style={styles.cardTitleRow}>
              <Ionicons name="calendar" size={20} color={colors.textPrimary} />
              <CardTitle>Weekly Attendance</CardTitle>
            </View>
          </CardHeader>
          <CardContent>
            <View style={styles.chartContainer}>
              {weeklyData.map((day, index) => (
                <Animated.View
                  key={day.day}
                  entering={FadeInLeft.delay(index * 50)}
                  style={styles.weekRow}
                >
                  <Text style={styles.dayLabel}>{day.day}</Text>
                  <View style={styles.barContainer}>
                    <View style={styles.barBackground}>
                      <Animated.View entering={FadeInLeft.delay(index * 50 + 200).duration(500)}>
                        <LinearGradient
                          colors={[colors.primary, colors.secondary]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[
                            styles.bar,
                            { width: `${(day.attendance / maxAttendance) * 100}%` },
                          ]}
                        />
                      </Animated.View>
                    </View>
                  </View>
                  <Text style={styles.attendanceCount}>{day.attendance}</Text>
                </Animated.View>
              ))}
            </View>
          </CardContent>
        </Card>
      </Animated.View>

      {/* Membership Distribution */}
      <Animated.View entering={FadeInUp.delay(600)}>
        <Card style={styles.card}>
          <CardHeader>
            <View style={styles.cardTitleRow}>
              <Ionicons name="trophy" size={20} color={colors.textPrimary} />
              <CardTitle>Membership Distribution</CardTitle>
            </View>
          </CardHeader>
          <CardContent>
            <View style={styles.membershipContainer}>
              {membershipData.map((membership, index) => (
                <Animated.View
                  key={membership.type}
                  entering={FadeInLeft.delay(index * 50)}
                  style={styles.membershipRow}
                >
                  <View
                    style={[
                      styles.membershipDot,
                      { backgroundColor: membership.color },
                    ]}
                  />
                  <Text style={styles.membershipType}>{membership.type}</Text>
                  <Text style={styles.membershipCount}>
                    {membership.count} members
                  </Text>
                </Animated.View>
              ))}
            </View>
            <View style={styles.membershipTotal}>
              <Text style={styles.membershipTotalLabel}>Total Members</Text>
              <Text style={styles.membershipTotalValue}>{stats.totalClients}</Text>
            </View>
          </CardContent>
        </Card>
      </Animated.View>

      {/* Quick Insights */}
      <Animated.View entering={FadeInUp.delay(800)}>
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle>Quick Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <View style={[styles.insightCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}20` }]}>
              <Ionicons name="trending-up" size={20} color={colors.primary} />
              <View style={styles.insightText}>
                <Text style={styles.insightTitle}>Great attendance rate!</Text>
                <Text style={styles.insightDescription}>
                  Your average attendance is {stats.avgAttendanceRate}%
                </Text>
              </View>
            </View>
            <View style={[styles.insightCard, { backgroundColor: `${colors.secondary}10`, borderColor: `${colors.secondary}20`, marginTop: 12 }]}>
              <Ionicons name="people" size={20} color={colors.secondary} />
              <View style={styles.insightText}>
                <Text style={styles.insightTitle}>Growing community</Text>
                <Text style={styles.insightDescription}>
                  You have {stats.activeClients} active members
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'flex-start',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartContainer: {
    gap: 12,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayLabel: {
    width: 48,
    fontSize: 14,
    color: colors.textSecondary,
  },
  barContainer: {
    flex: 1,
  },
  barBackground: {
    height: 32,
    backgroundColor: colors.muted,
    borderRadius: 8,
    overflow: 'hidden',
  },
  bar: {
    height: 32,
  },
  attendanceCount: {
    width: 32,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  membershipContainer: {
    gap: 12,
  },
  membershipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  membershipDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.card,
  },
  membershipType: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  membershipCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  membershipTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  membershipTotalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  membershipTotalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  insightCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  insightText: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
