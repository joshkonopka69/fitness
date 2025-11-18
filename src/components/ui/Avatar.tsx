import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function Avatar({ name, size = 'md', style }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  
  return (
    <View style={[styles.avatar, styles[`avatar_${size}`], style]}>
      <Text style={[styles.text, styles[`text_${size}`]]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar_sm: {
    width: 32,
    height: 32,
  },
  avatar_md: {
    width: 48,
    height: 48,
  },
  avatar_lg: {
    width: 64,
    height: 64,
  },
  text: {
    fontWeight: '600',
    color: colors.background,
  },
  text_sm: {
    fontSize: 14,
  },
  text_md: {
    fontSize: 18,
  },
  text_lg: {
    fontSize: 24,
  },
});



