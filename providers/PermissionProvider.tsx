import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";

type PermissionContextType = {
  loading: boolean;
  locationGranted: boolean;
  gpsEnabled: boolean;
  location: Location.LocationObject | null;
  requestLocationPermission: () => Promise<boolean>;
  refreshLocation: () => Promise<Location.LocationObject | null>;
};

const PermissionContext =
  createContext<PermissionContextType | null>(null);

export function PermissionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);

  const [locationGranted, setLocationGranted] =
    useState(false);

  const [gpsEnabled, setGpsEnabled] =
    useState(false);

  const [location, setLocation] =
    useState<Location.LocationObject | null>(null);

  const refreshLocation = useCallback(async () => {
    try {
      const current =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

      setLocation(current);

      return current;
    } catch (error) {
      console.log(error);
      return null;
    }
  }, []);

  const requestLocationPermission =
    useCallback(async () => {
      if (!locationGranted) {
        setLoading(true);
      }

      try {
        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (permission.status !== "granted") {
          setLocationGranted(false);
          return false;
        }

        setLocationGranted(true);

        const enabled =
          await Location.hasServicesEnabledAsync();

        setGpsEnabled(enabled);

        if (!enabled) {
          return false;
        }

        const current =
          await refreshLocation();

        return current !== null;
      } finally {
        setLoading(false);
      }
    }, [locationGranted, refreshLocation]);

  useEffect(() => {
    requestLocationPermission();
  }, [requestLocationPermission]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshLocation();
      }
    });

    return () => sub.remove();
  }, [refreshLocation]);

  return (
    <PermissionContext.Provider
      value={{
        loading,
        locationGranted,
        gpsEnabled,
        location,
        requestLocationPermission,
        refreshLocation,
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