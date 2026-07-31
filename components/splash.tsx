import { authClient } from '@/lib/auth-client';
import { SplashScreen } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export function SplashScreenController() {
  const { isPending } = authClient.useSession();

  if (!isPending) {
    SplashScreen.hide();
  }

  return null;
}
