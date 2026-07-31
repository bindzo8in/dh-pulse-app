import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

type PermissionContextType = {
  loading: boolean;
  granted: boolean;
  location: Location.LocationObject | null;
  refreshLocation: () => Promise<Location.LocationObject | null>;
  requestPermissions: () => Promise<void>;
};

const PermissionContext =
  createContext<PermissionContextType | null>(null);

export function PermissionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [granted, setGranted] = useState(false);
  const [location, setLocation] =
    useState<Location.LocationObject | null>(null);

  const refreshLocation = useCallback(async () => {
    try {
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation(current);

      return current;
    } catch {
      return null;
    }
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

      const enabled =
        await Location.hasServicesEnabledAsync();

      if (!enabled) {
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

  // Refresh GPS whenever app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active" && granted) {
          refreshLocation();
        }
      }
    );

    return () => sub.remove();
  }, [granted, refreshLocation]);

  return (
    <PermissionContext.Provider
      value={{
        loading,
        granted,
        location,
        refreshLocation,
        requestPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  const ctx = useContext(PermissionContext);

  if (!ctx) {
    throw new Error(
      "usePermission must be used inside PermissionProvider"
    );
  }

  return ctx;
}