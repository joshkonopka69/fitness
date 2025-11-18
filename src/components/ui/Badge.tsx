import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({
  children,
  variant = 'default',
  style,
  textStyle,
}: BadgeProps) {
  return (
    <View style={[styles.badge, styles[`badge_${variant}`], style]}>
      <Text style={[styles.text, styles[`text_${variant}`], textStyle]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  badge_default: {
    backgroundColor: `${colors.primary}20`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  badge_success: {
    backgroundColor: `${colors.primary}20`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  badge_warning: {
    backgroundColor: '#F59E0B20',
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  badge_destructive: {
    backgroundColor: `${colors.destructive}20`,
    borderWidth: 1,
    borderColor: `${colors.destructive}30`,
  },
  badge_secondary: {
    backgroundColor: `${colors.secondary}20`,
    borderWidth: 1,
    borderColor: `${colors.secondary}30`,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  text_default: {
    color: colors.primary,
  },
  text_success: {
    color: colors.primary,
  },
  text_warning: {
    color: '#F59E0B',
  },
  text_destructive: {
    color: colors.destructive,
  },
  text_secondary: {
    color: colors.secondary,
  },
});



