import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import 'react-native-gesture-handler';
import { AuthProvider } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { PurchasesProvider } from './src/contexts/PurchasesContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { testConnection } from './src/lib/supabase';
import AppNavigator from './src/navigation/AppNavigator';

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { isDark } = useTheme();
  
  useEffect(() => {
    // Test Supabase connection on app start
    testConnection();
  }, []);

  return (
    <>
      <AppNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <PurchasesProvider>
            <AppContent />
          </PurchasesProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}