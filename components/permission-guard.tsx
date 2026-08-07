import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import * as Linking from "expo-linking";

import { usePermission } from "@/providers/PermissionProvider";

export default function PermissionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    loading,
    locationGranted,
    gpsEnabled,
    requestLocationPermission,
  } = usePermission();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>
          Preparing Attendance...
        </Text>
      </View>
    );
  }

  if (!locationGranted) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: "bold",
            marginBottom: 16,
          }}
        >
          Location Permission Required
        </Text>

        <Text style={{ marginBottom: 24 }}>
          Location permission is required to mark attendance.
        </Text>

        <TouchableOpacity
          onPress={requestLocationPermission}
          style={{ marginBottom: 16 }}
        >
          <Text>Grant Permission</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={Linking.openSettings}>
          <Text>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!gpsEnabled) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: "bold",
            marginBottom: 16,
          }}
        >
          Turn On Location Services
        </Text>

        <Text style={{ marginBottom: 24 }}>
          GPS / Location Services are turned off. Please enable them to continue.
        </Text>

        <TouchableOpacity
          onPress={requestLocationPermission}
          style={{ marginBottom: 16 }}
        >
          <Text>Check Again</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={Linking.openSettings}>
          <Text>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}