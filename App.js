import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import useTheme from './src/hooks/useTheme';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation/navigationRef';

// Unutrašnja komponenta - mora biti unutar ThemeProvider da bi koristila useTheme
const ThemedApp = () => {
  const { isDark } = useTheme();
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={isDark ? DarkTheme : DefaultTheme}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </NavigationContainer>
  );
};

// Entry point aplikacije - SafeAreaProvider rešava navbar pozicioniranje na iPhone-u
// ThemeProvider čita sistemsku temu i distribuira boje kroz celu app
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedApp />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
