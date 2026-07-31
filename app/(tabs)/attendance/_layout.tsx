import { Stack } from "expo-router";
import { PermissionProvider } from "@/providers/PermissionProvider";
import PermissionGuard from "@/components/permission-guard";

export default function AttendanceLayout() {
  return (
    <PermissionProvider>
      <PermissionGuard>
        <Stack screenOptions={{ headerShown: false }} />
      </PermissionGuard>
    </PermissionProvider>
  );
}