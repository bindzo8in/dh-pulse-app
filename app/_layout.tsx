import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import 'react-native-reanimated';
import { activateKeepAwakeAsync } from 'expo-keep-awake';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SplashScreenController } from '@/components/splash';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    activateKeepAwakeAsync().catch((err) => {
      console.warn('Keep awake error caught safely:', err?.message || err);
    });
  }, []);

  return (
    <>
      <SplashScreenController />
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="leave" options={{ headerShown: false }} />
            {/* <Stack.Screen
            name="forgot-password"
            options={{
              title: "Forgot Password",
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="reset-password"
            options={{
              title: "Reset Password",
              headerShown: false,
            }}
          /> */}
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
    </>
  );
}
