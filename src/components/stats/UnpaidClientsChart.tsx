// ===============================================
// UNPAID CLIENTS CHART COMPONENT
// ===============================================
// Wykres klientów którzy nie zapłacili w tym miesiącu

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInLeft } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { 
  PaymentChartData, 
  PaymentChartViewMode,
  formatMonthYear,
  getCurrentMonthYear
} from '../../types/paymentTracking';

interface Props {
  data: PaymentChartData[];
  viewMode: PaymentChartViewMode;
  onViewModeChange: (mode: PaymentChartViewMode) => void;
  onBarPress: (item: PaymentChartData) => void;
  loading?: boolean;
  selectedCategory?: string | null;
  onBackPress?: () => void;
  level?: 'categories' | 'subcategories' | 'clients';
  breadcrumbLabel?: string | null;
}

export function UnpaidClientsChart({
  data,
  viewMode,
  onViewModeChange,
  onBarPress,
  loading = false,
  selectedCategory = null,
  onBackPress,
  level = 'categories',
  breadcrumbLabel = null,
}: Props) {
  const { year, month } = getCurrentMonthYear();
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const getBarColor = (item: PaymentChartData) => {
    return item.color || colors.primary;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Ładowanie danych...</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-circle" size={48} color={colors.success} />
        <Text style={styles.emptyTitle}>Wszyscy zapłacili! 🎉</Text>
        <Text style={styles.emptySubtitle}>
          Brak nieopłaconych klientów w {formatMonthYear(year, month)}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with View Mode Toggle */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {selectedCategory && onBackPress && (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={onBackPress}
            >
              <Ionicons name="arrow-back" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
          <Text style={styles.monthLabel}>
            {formatMonthYear(year, month)}
          </Text>
        </View>

        {!selectedCategory && (
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === 'categories' && styles.toggleButtonActive,
              ]}
              onPress={() => onViewModeChange('categories')}
            >
              <Ionicons 
                name="grid" 
                size={16} 
                color={viewMode === 'categories' ? colors.background : colors.textSecondary} 
              />
              <Text
                style={[
                  styles.toggleText,
                  viewMode === 'categories' && styles.toggleTextActive,
                ]}
              >
                Grupy
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === 'individuals' && styles.toggleButtonActive,
              ]}
              onPress={() => onViewModeChange('individuals')}
            >
              <Ionicons 
                name="people" 
                size={16} 
                color={viewMode === 'individuals' ? colors.background : colors.textSecondary} 
              />
              <Text
                style={[
                  styles.toggleText,
                  viewMode === 'individuals' && styles.toggleTextActive,
                ]}
              >
                Osoby
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {breadcrumbLabel && (
        <Text style={styles.breadcrumbText}>
          {breadcrumbLabel}
        </Text>
      )}

      {/* Chart */}
      <View style={styles.chartContainer}>
        {data.map((item, index) => (
          <Animated.View
            key={item.id}
            entering={FadeInLeft.delay(index * 50)}
          >
            <TouchableOpacity
              style={styles.barRow}
              onPress={() => onBarPress(item)}
              activeOpacity={0.7}
            >
              {/* Label */}
              <View style={styles.labelContainer}>
                <Text style={styles.labelText} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>

              {/* Bar */}
              <View style={styles.barContainer}>
                <View style={styles.barBackground}>
                  <Animated.View 
                    entering={FadeInLeft.delay(index * 50 + 200).duration(500)}
                    style={{ width: `${(item.value / maxValue) * 100}%` }}
                  >
                    <LinearGradient
                      colors={[getBarColor(item), `${getBarColor(item)}CC`]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.bar}
                    />
                  </Animated.View>
                </View>
              </View>

              {/* Value */}
              <Text style={styles.valueText}>{item.value}</Text>

              {/* Arrow for categories */}
              {viewMode === 'categories' && level !== 'clients' && (
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={colors.textSecondary} 
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/* Hint */}
      {viewMode === 'categories' && !selectedCategory && (
        <View style={styles.hintContainer}>
          <Ionicons name="information-circle" size={16} color={colors.textSecondary} />
          <Text style={styles.hintText}>
            Kliknij na grupę aby zobaczyć szczegóły
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'Poppins-Regular',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: 'Poppins-SemiBold',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'Poppins-Regular',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: 'Poppins-SemiBold',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'Poppins-Regular',
  },
  toggleTextActive: {
    color: colors.background,
    fontFamily: 'Poppins-SemiBold',
  },
  chartContainer: {
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
  },
  labelText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: 'Poppins-Regular',
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
  valueText: {
    width: 32,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'right',
    fontFamily: 'Poppins-SemiBold',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hintText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'Poppins-Regular',
  },
  breadcrumbText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'Poppins-Medium',
    paddingLeft: 4,
  },
});


