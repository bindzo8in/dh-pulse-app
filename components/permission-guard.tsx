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
    granted,
    requestPermissions,
  } = usePermission();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
        <Text>Preparing Attendance...</Text>
      </View>
    );
  }

  if (!granted) {
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
            marginBottom: 20,
          }}
        >
          Permissions Required
        </Text>

        <Text style={{ marginBottom: 24 }}>
          Camera and Location permissions are required to use attendance.
        </Text>

        <TouchableOpacity
          onPress={requestPermissions}
        >
          <Text>Grant Permission</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={Linking.openSettings}
        >
          <Text>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}