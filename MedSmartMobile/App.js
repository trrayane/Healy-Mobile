import 'react-native-gesture-handler';
import React, { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider }     from './src/context/AuthContext';
import { ThemeProvider }    from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { DataProvider }     from './src/context/DataContext';
import AppNavigator         from './src/navigation/AppNavigator';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const onReady = useCallback(async () => {
    await SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onReady}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <DataProvider>
                <StatusBar style="auto" />
                <AppNavigator />
              </DataProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}