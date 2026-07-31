import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SplashScreenController } from '@/components/splash';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

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
