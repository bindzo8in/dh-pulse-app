import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authClient } from '@/lib/auth-client';
import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useAttendanceOfflineStore } from '@/stores/attendance-offline-store';

const API_BASE_URL = `${process.env.EXPO_PUBLIC_BETTER_AUTH_SERVER_URL}/api`;

export default function HomeScreen() {
  const { data: session, isPending } = authClient.useSession();


  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const attendanceRecord = useAttendanceOfflineStore((s) => s.currentRecord);
  const setAttendanceRecord = useAttendanceOfflineStore((s) => s.setRecord);
  const syncQueue = useAttendanceOfflineStore((s) => s.syncQueue);

  const [holidays, setHolidays] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      // Fetch Today's Attendance and Upcoming Holidays concurrently
      const [attRes, holRes] = await Promise.all([
        authClient.$fetch(`${API_BASE_URL}/attendance/today`),
        authClient.$fetch(`${API_BASE_URL}/holiday/upcoming`, { method: 'POST' }),
      ]);

      const attData = attRes.data;
      if (attData && (attData as any).success) {
        if (syncQueue.length === 0) {
          setAttendanceRecord((attData as any).record);
        }
      }

      const holData = holRes.data;
      if (holData && (holData as any).success) {
        setHolidays((holData as any).holidays || []);
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isPending) return;
    if (!session) return;

    fetchData();
  }, [isPending, session]);


  if (isPending) return null;
  if (!session) {
    return <Redirect href="/account" />;
  }

  const isClockedIn = attendanceRecord && !attendanceRecord.clockOut;
  const todayDate = format(new Date(), 'EEEE, MMMM do');



  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} tintColor={colors.tint} />}
    >
      {/* Welcome Header */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <View>
          <Text style={styles.dateText}>{todayDate}</Text>
          <Text style={styles.welcomeText}>Hello, {session?.user?.name || session?.user?.email || 'User'} 👋</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/(tabs)/account')}>
          <MaterialIcons name="person" size={24} color={colors.tint} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Today's Status Card */}
        <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Today&apos;s Status</Text>

          <View style={styles.statusRow}>
            {isClockedIn ? (
              <View style={styles.statusBadge}>
                <MaterialIcons name="check-circle" size={20} color="#10b981" />
                <Text style={[styles.statusText, { color: '#10b981' }]}>Clocked In</Text>
              </View>
            ) : (
              <View style={styles.statusBadge}>
                <MaterialIcons name="cancel" size={20} color="#ef4444" />
                <Text style={[styles.statusText, { color: '#ef4444' }]}>Not Clocked In</Text>
              </View>
            )}

            {isClockedIn && attendanceRecord?.clockIn && (
              <Text style={[styles.timeText, { color: colors.text }]}>
                at {format(new Date(attendanceRecord.clockIn), 'hh:mm a')}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/(tabs)/attendance')}
          >
            <MaterialIcons name="fingerprint" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Go to Punch Tab</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Links Grid */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.grid}>
          <TouchableOpacity
            style={[styles.gridItem, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}
            onPress={() => router.push('/leave')}
          >
            <View style={[styles.iconWrapper, { backgroundColor: colors.tint + '20' }]}>
              <MaterialIcons name="event-busy" size={28} color={colors.tint} />
            </View>
            <Text style={[styles.gridItemText, { color: colors.text }]}>Leaves</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.gridItem, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
            <View style={[styles.iconWrapper, { backgroundColor: '#f59e0b20' }]}>
              <MaterialIcons name="receipt-long" size={28} color="#f59e0b" />
            </View>
            <Text style={[styles.gridItemText, { color: colors.text }]}>Payslips</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.gridItem, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
            <View style={[styles.iconWrapper, { backgroundColor: '#10b98120' }]}>
              <MaterialIcons name="campaign" size={28} color="#10b981" />
            </View>
            <Text style={[styles.gridItemText, { color: colors.text }]}>Notices</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Holidays */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Holidays</Text>
        <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#fff', padding: 0, overflow: 'hidden' }]}>
          {holidays.length === 0 ? (
            <Text style={[styles.emptyText, { color: isDark ? '#888' : '#666' }]}>No upcoming holidays.</Text>
          ) : (
            holidays.map((hol, idx) => (
              <View
                key={hol.id}
                style={[
                  styles.holidayRow,
                  idx < holidays.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? '#333' : '#eee' }
                ]}
              >
                <View style={[styles.holidayDateBox, { backgroundColor: colors.tint + '20' }]}>
                  <Text style={[styles.holidayDay, { color: colors.tint }]}>{format(new Date(hol.date), 'dd')}</Text>
                  <Text style={[styles.holidayMonth, { color: colors.tint }]}>{format(new Date(hol.date), 'MMM')}</Text>
                </View>
                <View style={styles.holidayInfo}>
                  <Text style={[styles.holidayName, { color: colors.text }]}>{hol.name}</Text>
                  {hol.description && <Text style={[styles.holidayDesc, { color: isDark ? '#888' : '#666' }]}>{hol.description}</Text>}
                </View>
              </View>
            ))
          )}
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '600',
  },
  welcomeText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileBtn: {
    backgroundColor: '#fff',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    marginTop: -20,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 14,
    opacity: 0.7,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  gridItem: {
    width: '30%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gridItemText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
  },
  holidayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  holidayDateBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holidayDay: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  holidayMonth: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  holidayInfo: {
    flex: 1,
  },
  holidayName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  holidayDesc: {
    fontSize: 13,
  },
});
