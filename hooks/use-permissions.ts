import { useCallback, useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

export function usePermissions() {
  const [loading, setLoading] = useState(true);
  const [granted, setGranted] = useState(false);
  const [location, setLocation] =
    useState<Location.LocationObject | null>(null);

  const refreshLocation = useCallback(async () => {
    const currentLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    setLocation(currentLocation);
  }, []);

  const requestPermissions = useCallback(async () => {
    setLoading(true);

    try {
      const [camera, gps] = await Promise.all([
        ImagePicker.requestCameraPermissionsAsync(),
        Location.requestForegroundPermissionsAsync(),
      ]);

      if (
        camera.status !== "granted" ||
        gps.status !== "granted"
      ) {
        setGranted(false);
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        setGranted(false);
        return;
      }

      await refreshLocation();

      setGranted(true);
    } finally {
      setLoading(false);
    }
  }, [refreshLocation]);

  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  // Refresh GPS every 30 seconds
  useEffect(() => {
    if (!granted) return;

    const interval = setInterval(() => {
      refreshLocation().catch(console.error);
    }, 30000);

    return () => clearInterval(interval);
  }, [granted, refreshLocation]);

  return {
    loading,
    granted,
    location,
    refreshLocation,
    requestPermissions,
  };
}