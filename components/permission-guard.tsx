import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import * as Linking from "expo-linking";
import { authClient } from "@/lib/auth-client";
import { usePermission } from "@/providers/PermissionProvider";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";

export default function PermissionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, refetch } = authClient.useSession();
  const {
    loading,
    locationGranted,
    gpsEnabled,
    requestLocationPermission,
  } = usePermission();

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const user = session?.user as any;
  const role = user?.role;
  const department = user?.department;

  const isAdminOrSuperAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
  const hasRole = !!role && role.trim() !== "" && role !== "—";
  const hasDepartment = !!department && department.trim() !== "" && department !== "—";
  const isAuthorized = isAdminOrSuperAdmin || (hasRole && hasDepartment);

  // 1. Initial Cold Start Loading Spinner
  if (loading && !locationGranted) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Preparing Attendance...
        </Text>
      </View>
    );
  }

  // 2. Role & Department Authorization Check
  if (session && !isAuthorized) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background, padding: 24 }]}>
        <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
          <View style={styles.iconWrapper}>
            <Ionicons name="shield-half-outline" size={56} color="#ef4444" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Attendance Access Restricted
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#aaa' : '#666' }]}>
            You must be assigned both an active Role and a Department by an administrator to access Attendance features.
          </Text>

          <View style={[styles.detailsBox, { backgroundColor: isDark ? '#2c2c2e' : '#f8f9fa' }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: isDark ? '#aaa' : '#666' }]}>Role:</Text>
              <Text style={[styles.detailValue, hasRole ? { color: '#10b981' } : { color: '#ef4444' }]}>
                {hasRole ? role : 'Not Assigned'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: isDark ? '#aaa' : '#666' }]}>Department:</Text>
              <Text style={[styles.detailValue, hasDepartment ? { color: '#10b981' } : { color: '#ef4444' }]}>
                {hasDepartment ? department : 'Not Assigned'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.tint }]}
            onPress={() => refetch()}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Check Status</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 3. Location Permission Check
  if (!locationGranted) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background, padding: 24 }]}>
        <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
          <View style={styles.iconWrapper}>
            <Ionicons name="location-outline" size={56} color={colors.tint} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Location Permission Required
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#aaa' : '#666' }]}>
            Location permission is required to verify work area and mark attendance.
          </Text>

          <TouchableOpacity
            onPress={requestLocationPermission}
            style={[styles.primaryButton, { backgroundColor: colors.tint, marginBottom: 12 }]}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={Linking.openSettings}
            style={[styles.secondaryButton, { borderColor: isDark ? '#444' : '#ddd' }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Open Device Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 4. GPS Services Enabled Check
  if (!gpsEnabled) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background, padding: 24 }]}>
        <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
          <View style={styles.iconWrapper}>
            <Ionicons name="navigate-outline" size={56} color="#f59e0b" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Turn On Location Services
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#aaa' : '#666' }]}>
            GPS / Location Services are turned off on your device. Please enable location to continue.
          </Text>

          <TouchableOpacity
            onPress={requestLocationPermission}
            style={[styles.primaryButton, { backgroundColor: '#f59e0b', marginBottom: 12 }]}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Check Location Status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={Linking.openSettings}
            style={[styles.secondaryButton, { borderColor: isDark ? '#444' : '#ddd' }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  card: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  iconWrapper: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  detailsBox: {
    width: "100%",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(150, 150, 150, 0.15)",
    marginVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  primaryButton: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});