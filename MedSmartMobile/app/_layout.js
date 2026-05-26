import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { LogBox } from 'react-native';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { AuthProvider } from '../src/context/AuthContext';
import { DataProvider } from '../src/context/DataContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

// ─── Supprime les logs réseau attendus (backend hors ligne) ──────────────────
LogBox.ignoreLogs([
  'Network request failed',
  'Aborted',
  'AbortError',
  'Serveur injoignable',
  'timeout',
]);

function RootLayoutNav() {
  const { dk } = useTheme();
  return (
    <>
      <StatusBar style={dk ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="auth" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(app)" options={{ animation: 'none' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'PlusJakartaSans-Regular':   PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium':    PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold':  PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold':      PlusJakartaSans_700Bold,
    'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Afficher même si la police n'a pas chargé (fallback système)
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <DataProvider>
                <RootLayoutNav />
              </DataProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}