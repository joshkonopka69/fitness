import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { create{{NAVIGATION_TYPE}}Navigator } from '@react-navigation/{{NAVIGATION_TYPE}}';
import { colors } from '../theme/colors';

// Import your screens here
{{SCREENS}}

const {{NAVIGATION_TYPE}} = create{{NAVIGATION_TYPE}}Navigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <{{NAVIGATION_TYPE}}.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {/* Add your screens here */}
      </{{NAVIGATION_TYPE}}.Navigator>
    </NavigationContainer>
  );
}

