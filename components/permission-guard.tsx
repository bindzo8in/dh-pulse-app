import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import * as Linking from "expo-linking";
import { usePermission } from "@/providers/PermissionProvider";

export default function PermissionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Destructure the correct property names
  const {
    loading,
    locationGranted,
    requestLocationPermission,
  } = usePermission();

  console.log("PermissionGuard", { loading, locationGranted });

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text>Preparing Attendance...</Text>
      </View>
    );
  }

  // 2. Check locationGranted instead
  if (!locationGranted) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 20 }}>
          Permissions Required
        </Text>

        <Text style={{ marginBottom: 24 }}>
          Location permissions are required to use attendance.
        </Text>

        {/* 3. Use the correct function here */}
        <TouchableOpacity onPress={requestLocationPermission}>
          <Text>Grant Permission</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={Linking.openSettings}>
          <Text>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}