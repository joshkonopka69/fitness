import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { colors, spacing } from '../../theme/colors';

interface {{COMPONENT_NAME}}Props {
  // Add your props here
  onPress?: () => void;
  children?: React.ReactNode;
}

export default function {{COMPONENT_NAME}}({ 
  onPress, 
  children 
}: {{COMPONENT_NAME}}Props) {
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

