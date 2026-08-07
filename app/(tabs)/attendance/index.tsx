import { router, Redirect } from "expo-router";
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authClient } from '@/lib/auth-client';
import { Ionicons } from '@expo/vector-icons';
import PermissionGuard from '@/components/permission-guard';
import { usePermission } from "@/providers/PermissionProvider";
import { useSelfieStore } from "@/stores/selfie-store";
import { useAttendanceOfflineStore } from "@/stores/attendance-offline-store";
import { File, Paths } from 'expo-file-system';
import { useSync } from "@/providers/SyncProvider";
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const API_BASE_URL = `${process.env.EXPO_PUBLIC_BETTER_AUTH_SERVER_URL}/api/attendance`;

export default function AttendanceScreen() {
  return (
    <PermissionGuard>
      <AttendanceContent />
    </PermissionGuard>
  );
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.clockContainer}>
      <Text style={[styles.timeText, { color: colors.text }]}>
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </Text>
      <Text style={[styles.dateText, { color: isDark ? '#8e8e93' : '#8e8e93' }]}>
        {time.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </Text>
    </View>
  );
}

function AttendanceContent() {
  const selfieUri = useSelfieStore((s) => s.uri);
  const setSelfieUri = useSelfieStore((s) => s.setUri);
  const { data: session, isPending } = authClient.useSession();
  const {
    location,
    refreshLocation,
  } = usePermission();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const record = useAttendanceOfflineStore((s) => s.currentRecord);
  const setRecord = useAttendanceOfflineStore((s) => s.setRecord);
  const addOfflineAction = useAttendanceOfflineStore((s) => s.addOfflineAction);
  const syncQueue = useAttendanceOfflineStore((s) => s.syncQueue);
  const { isSyncing, retrySync } = useSync();

  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [userWorkMode, setUserWorkMode] = useState<'OFFICE' | 'REMOTE' | 'HYBRID'>('OFFICE');

  const [activeTab, setActiveTab] = useState<'punch' | 'report'>('punch');
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    if (!selfieUri) return;
    handleOfflineClockIn(selfieUri);
    setSelfieUri(null);
  }, [selfieUri]);

  async function handleOfflineClockIn(uri: string) {
    setActionLoading(true);
    try {
      const latestLocation = await refreshLocation();
      if (!latestLocation) {
        Alert.alert("Location Error", "Unable to get location.");
        return;
      }

      const fileName = `selfie_${Date.now()}.jpg`;
      const sourceFile = new File(uri);
      const permanentFile = new File(Paths.document, fileName);
      sourceFile.move(permanentFile);
      const permanentUri = permanentFile.uri;

      const optimisticRecord = {
        clockIn: new Date().toISOString(),
        workMode: userWorkMode,
        status: 'PRESENT',
        isOffline: true,
      };

      setRecord(optimisticRecord);
      addOfflineAction({
        type: 'CLOCK_IN',
        payload: {
          workMode: userWorkMode,
          latitude: latestLocation.coords.latitude,
          longitude: latestLocation.coords.longitude,
          localSelfieUri: permanentUri,
        },
      });

      Alert.alert("✓ Clocked In", "Attendance recorded successfully!");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setActionLoading(false);
    }
  }

  const handleClockOut = async () => {
    const updatedRecord = { ...record, clockOut: new Date().toISOString() };
    setRecord(updatedRecord);
    addOfflineAction({
      type: 'CLOCK_OUT',
      payload: {},
    });
    Alert.alert("✓ Clocked Out", "Have a great day!");
  };

  const handleStartBreak = async () => {
    const newBreak = { breakStart: new Date().toISOString(), type: 'LUNCH' };
    const updatedRecord = {
      ...record,
      breaks: [...(record?.breaks || []), newBreak],
    };
    setRecord(updatedRecord);
    addOfflineAction({
      type: 'START_BREAK',
      payload: { type: 'LUNCH' },
    });
  };

  const handleEndBreak = async () => {
    const updatedBreaks = record?.breaks?.map((b: any) =>
      !b.breakEnd ? { ...b, breakEnd: new Date().toISOString() } : b
    );
    const updatedRecord = { ...record, breaks: updatedBreaks };
    setRecord(updatedRecord);
    addOfflineAction({
      type: 'END_BREAK',
      payload: {},
    });
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const { data, error } = await authClient.$fetch(`${API_BASE_URL}/logs`, {
        method: 'POST',
        body: { limit: 15, page: 1 },
      });
      if (error) throw error;
      if (data && (data as any).success) {
        setLogs((data as any).records || []);
      }
    } catch (e) {
      console.error('Failed to fetch logs', e);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchTodayRecord = async () => {
    try {
      const { data, error } = await authClient.$fetch(`${API_BASE_URL}/today`);
      if (error) throw error;
      if (data && (data as any).success) {
        const payload = data as any;
        if (syncQueue.length === 0) {
          setRecord(payload.record);
        }
        setSettings(payload.settings);
        if (payload.userWorkMode) {
          setUserWorkMode(payload.userWorkMode);
        }
      }
    } catch (e) {
      console.error('Failed to fetch attendance', e);
    } finally {
      setLoading(false);
    }
  };

  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      fetchTodayRecord();
    }
  }, [userId]);

  useEffect(() => {
    if (userId && activeTab === 'report') {
      fetchLogs();
    }
  }, [userId, activeTab]);

  if (isPending) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/account" />;
  }

  const handleClockIn = async () => {
    try {
      const latestLocation = await refreshLocation();
      if (!latestLocation) {
        Alert.alert("Location Error", "Unable to get your current location.");
        return;
      }
      router.push("/attendance/selfie");
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'An unexpected error occurred');
    }
  };

  const isClockedIn = !!record && !record.clockOut;
  const openBreak = record?.breaks?.find((b: any) => !b.breakEnd);
  const isOnBreak = !!openBreak;

  const completedLogs = logs.filter(l => l.clockOut);
  const totalDays = completedLogs.length;
  const totalPresent = completedLogs.filter(l => l.status === 'PRESENT').length;
  const totalLate = completedLogs.filter(l => l.status === 'LATE').length;
  const totalHalfDay = completedLogs.filter(l => l.status === 'HALF_DAY').length;
  const totalMinutes = completedLogs.reduce((acc, curr) => acc + (curr.workMinutes || 0), 0);
  const avgHoursPerDay = totalDays > 0 ? (totalMinutes / 60 / totalDays).toFixed(1) : '0';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Attendance</Text>
        <Text style={[styles.headerSubtitle, { color: isDark ? '#8e8e93' : '#8e8e93' }]}>
          {session.user?.email}
        </Text>
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: isDark ? '#1c1c1e' : '#f2f2f7' }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'punch' && {
              backgroundColor: isDark ? '#2c2c2e' : '#ffffff',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }
          ]}
          onPress={() => setActiveTab('punch')}
        >
          <Ionicons
            name="time-outline"
            size={20}
            color={activeTab === 'punch' ? colors.tint : '#8e8e93'}
          />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'punch' ? colors.tint : '#8e8e93' }
          ]}>Punch Clock</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'report' && {
              backgroundColor: isDark ? '#2c2c2e' : '#ffffff',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }
          ]}
          onPress={() => setActiveTab('report')}
        >
          <Ionicons
            name="stats-chart-outline"
            size={20}
            color={activeTab === 'report' ? colors.tint : '#8e8e93'}
          />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'report' ? colors.tint : '#8e8e93' }
          ]}>Report</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'punch' ? (
        <>
          <LiveClock />

          {syncQueue.length > 0 && (
            <TouchableOpacity
              onPress={() => retrySync()}
              activeOpacity={0.7}
              style={[styles.syncStatus, { backgroundColor: colors.tint + '15' }]}
            >
              <ActivityIndicator size="small" color={colors.tint} />
              <Text style={{ color: colors.tint, fontSize: 13, fontWeight: '500' }}>
                {isSyncing ? "Syncing..." : `${syncQueue.length} item${syncQueue.length > 1 ? 's' : ''} pending (tap to retry)`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Work Mode Badge */}
          <View style={styles.workModeContainer}>
            <View style={[styles.workModeBadge, {
              backgroundColor: userWorkMode === 'OFFICE' ? '#3b82f6' :
                               userWorkMode === 'REMOTE' ? '#10b981' : '#8b5cf6'
            }]}>
              <Ionicons
                name={userWorkMode === 'OFFICE' ? 'business-outline' :
                       userWorkMode === 'REMOTE' ? 'home-outline' : 'git-branch-outline'}
                size={20}
                color="#fff"
              />
              <Text style={styles.workModeBadgeText}>{userWorkMode}</Text>
            </View>
          </View>

          <View style={styles.actionContainer}>
            {record?.clockOut ? (
              <View style={[styles.statusCard, { backgroundColor: isDark ? '#1a3a2a' : '#ecfdf5' }]}>
                <View style={styles.statusIconContainer}>
                  <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                </View>
                <Text style={[styles.statusTitle, { color: '#10b981' }]}>Shift Completed</Text>
                <Text style={[styles.statusSub, { color: isDark ? '#6ee7b7' : '#065f46' }]}>
                  You&apos;ve successfully completed today&apos;s shift
                </Text>
              </View>
            ) : !isClockedIn ? (
              <TouchableOpacity
                style={styles.clockInButton}
                onPress={handleClockIn}
                disabled={actionLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.tint, colors.tint + 'cc']}
                  style={styles.gradientButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="log-in-outline" size={28} color="#fff" />
                      <Text style={styles.mainButtonText}>Clock In</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.activeSessionContainer}>
                <View style={[styles.statusCard, { backgroundColor: isDark ? '#1c1c1e' : '#f8f9fa' }]}>
                  <View style={styles.statusIconContainer}>
                    <Ionicons name="timer-outline" size={40} color={colors.tint} />
                  </View>
                  <Text style={[styles.statusTitle, { color: colors.text }]}>
                    {isOnBreak ? 'On Break' : 'Active Session'}
                  </Text>
                  <Text style={[styles.statusSub, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
                    Since {new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                <View style={styles.actionButtonsGrid}>
                  {isOnBreak ? (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.endBreakButton]}
                      onPress={handleEndBreak}
                      disabled={actionLoading}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="cafe-outline" size={24} color="#f59e0b" />
                      <Text style={styles.actionButtonText}>End Break</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.startBreakButton]}
                      onPress={handleStartBreak}
                      disabled={actionLoading}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="cafe-outline" size={24} color="#3b82f6" />
                      <Text style={styles.actionButtonText}>Start Break</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionButton, styles.clockOutButton, isOnBreak && styles.disabledButton]}
                    onPress={handleClockOut}
                    disabled={actionLoading || isOnBreak}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                    <Text style={[styles.actionButtonText, styles.clockOutText]}>Clock Out</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </>
      ) : (
        <View style={styles.reportContainer}>
          {logsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : completedLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={isDark ? '#3a3a3c' : '#c7c7cc'} />
              <Text style={[styles.noLogsText, { color: isDark ? '#8e8e93' : '#8e8e93' }]}>
                No attendance records found
              </Text>
              <Text style={[styles.emptySubtext, { color: isDark ? '#636366' : '#aeaeb2' }]}>
                Complete your first shift to see reports
              </Text>
            </View>
          ) : (
            <>
              {/* Summary Cards */}
              <View style={styles.summaryGrid}>
                <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
                  <Text style={[styles.summaryValue, { color: '#10b981' }]}>{totalPresent}</Text>
                  <Text style={[styles.summaryLabel, { color: isDark ? '#8e8e93' : '#6b7280' }]}>Present</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
                  <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{totalLate}</Text>
                  <Text style={[styles.summaryLabel, { color: isDark ? '#8e8e93' : '#6b7280' }]}>Late</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
                  <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{totalHalfDay}</Text>
                  <Text style={[styles.summaryLabel, { color: isDark ? '#8e8e93' : '#6b7280' }]}>Half Day</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
                  <Text style={[styles.summaryValue, { color: colors.tint }]}>{avgHoursPerDay}h</Text>
                  <Text style={[styles.summaryLabel, { color: isDark ? '#8e8e93' : '#6b7280' }]}>Avg / Day</Text>
                </View>
              </View>

              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent History</Text>

              {completedLogs.map((log) => {
                const logDate = new Date(log.date);
                const hrs = Math.floor(log.workMinutes / 60);
                const mins = log.workMinutes % 60;
                return (
                  <View key={log.id} style={[styles.logCard, {
                    backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
                    borderColor: isDark ? '#2c2c2e' : '#f2f2f7'
                  }]}>
                    <View style={styles.logHeader}>
                      <Text style={[styles.logDate, { color: colors.text }]}>
                        {logDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                      <View style={[
                        styles.statusBadge,
                        log.status === 'PRESENT' ? { backgroundColor: '#10b98120' } :
                        log.status === 'LATE' ? { backgroundColor: '#f59e0b20' } :
                        { backgroundColor: '#ef444420' }
                      ]}>
                        <Text style={[
                          styles.statusBadgeText,
                          log.status === 'PRESENT' ? { color: '#10b981' } :
                          log.status === 'LATE' ? { color: '#f59e0b' } :
                          { color: '#ef4444' }
                        ]}>{log.status}</Text>
                      </View>
                    </View>

                    <View style={styles.logDetails}>
                      <View style={styles.logDetailRow}>
                        <Ionicons name="log-in-outline" size={16} color={colors.icon} />
                        <Text style={[styles.logDetailText, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
                          {new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <View style={styles.logDetailRow}>
                        <Ionicons name="log-out-outline" size={16} color={colors.icon} />
                        <Text style={[styles.logDetailText, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
                          {log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.logFooter, { borderTopColor: isDark ? '#2c2c2e' : '#f2f2f7' }]}>
                      <Text style={[styles.workHoursText, { color: colors.text }]}>
                        <Ionicons name="time-outline" size={16} color={colors.tint} /> {hrs}h {mins}m
                      </Text>
                      <Text style={[styles.workModeLabel, { color: isDark ? '#636366' : '#aeaeb2' }]}>
                        {log.workMode}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  clockContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 56,
    fontWeight: '200',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  dateText: {
    fontSize: 16,
    marginTop: 8,
    fontWeight: '400',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    justifyContent: 'center',
  },
  workModeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  workModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  workModeBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: 4,
  },
  clockInButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  activeSessionContainer: {
    gap: 16,
  },
  statusCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  statusIconContainer: {
    marginBottom: 4,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  statusSub: {
    fontSize: 14,
    textAlign: 'center',
  },
  actionButtonsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#f2f2f7',
  },
  startBreakButton: {
    backgroundColor: '#3b82f620',
  },
  endBreakButton: {
    backgroundColor: '#f59e0b20',
  },
  clockOutButton: {
    backgroundColor: '#ef444420',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1c1c1e',
  },
  clockOutText: {
    color: '#ef4444',
  },
  reportContainer: {
    marginTop: 8,
    gap: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  noLogsText: {
    fontSize: 18,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    minWidth: (width - 60) / 4,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  logCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  logDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logDetailText: {
    fontSize: 14,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  workHoursText: {
    fontSize: 14,
    fontWeight: '500',
  },
  workModeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
// import { router } from "expo-router";
// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
// import { Colors } from '@/constants/theme';
// import { useColorScheme } from '@/hooks/use-color-scheme';
// import { authClient } from '@/lib/auth-client';
// import { MaterialIcons } from '@expo/vector-icons';
// // import * as Location from 'expo-location';
// import * as ImagePicker from 'expo-image-picker';
// import { Redirect } from 'expo-router';
// import PermissionGuard from '@/components/permission-guard';
// import { usePermission } from "@/providers/PermissionProvider";
// import { useSelfieStore } from "@/stores/selfie-store";
// import { useAttendanceOfflineStore } from "@/stores/attendance-offline-store";
// import { File, Paths } from 'expo-file-system';
// import { useSync } from "@/providers/SyncProvider";
//
// const API_BASE_URL = `${process.env.EXPO_PUBLIC_BETTER_AUTH_SERVER_URL}/api/attendance`;
//
// export default function AttendanceScreen() {
//   return (
//     <PermissionGuard>
//       <AttendanceContent />
//     </PermissionGuard>
//   );
// }
//
// function LiveClock() {
//   const [time, setTime] = useState(new Date());
//   const colorScheme = useColorScheme() ?? 'light';
//   const colors = Colors[colorScheme];
//   const isDark = colorScheme === 'dark';
//
//   useEffect(() => {
//     const timer = setInterval(() => setTime(new Date()), 1000);
//     return () => clearInterval(timer);
//   }, []);
//
//   return (
//     <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 40 }}>
//       <Text style={[styles.timeText, { color: colors.text }]}>
//         {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
//       </Text>
//       <Text style={[styles.dateText, { color: isDark ? '#ccc' : '#666' }]}>
//         {time.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
//       </Text>
//     </View>
//   );
// }
//
// function AttendanceContent() {
//   const selfieUri = useSelfieStore((s) => s.uri);
//   const setSelfieUri = useSelfieStore((s) => s.setUri);
//   const { data: session, isPending } = authClient.useSession();
//   const {
//     location,
//     refreshLocation,
//   } = usePermission();
//   const colorScheme = useColorScheme() ?? 'light';
//   const colors = Colors[colorScheme];
//   const isDark = colorScheme === 'dark';
//
//   const record = useAttendanceOfflineStore((s) => s.currentRecord);
//   const setRecord = useAttendanceOfflineStore((s) => s.setRecord);
//   const addOfflineAction = useAttendanceOfflineStore((s) => s.addOfflineAction);
//   const syncQueue = useAttendanceOfflineStore((s) => s.syncQueue);
//   const { isSyncing } = useSync();
//
//   const [settings, setSettings] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [actionLoading, setActionLoading] = useState(false);
//   const [userWorkMode, setUserWorkMode] = useState<'OFFICE' | 'REMOTE' | 'HYBRID'>('OFFICE');
//
//   const [activeTab, setActiveTab] = useState<'punch' | 'report'>('punch');
//   const [logs, setLogs] = useState<any[]>([]);
//   const [logsLoading, setLogsLoading] = useState(false);
//
//   useEffect(() => {
//     if (!selfieUri) return;
//
//     handleOfflineClockIn(selfieUri);
//
//     setSelfieUri(null);
//   }, [selfieUri]);
//
//   async function handleOfflineClockIn(uri: string) {
//     setActionLoading(true);
//
//     try {
//       const latestLocation = await refreshLocation();
//
//       if (!latestLocation) {
//         Alert.alert("Location Error", "Unable to get location.");
//         return;
//       }
//
//       // Move selfie to permanent storage
//       const fileName = `selfie_${Date.now()}.jpg`;
//       const sourceFile = new File(uri);
//       const permanentFile = new File(Paths.document, fileName);
//       sourceFile.move(permanentFile);
//       const permanentUri = permanentFile.uri;
//
//       // Optimistic Update
//       const optimisticRecord = {
//         clockIn: new Date().toISOString(),
//         workMode: userWorkMode,
//         status: 'PRESENT',
//         isOffline: true,
//       };
//
//       setRecord(optimisticRecord);
//
//       // Add to Sync Queue
//       addOfflineAction({
//         type: 'CLOCK_IN',
//         payload: {
//           workMode: userWorkMode,
//           latitude: latestLocation.coords.latitude,
//           longitude: latestLocation.coords.longitude,
//           localSelfieUri: permanentUri,
//         },
//       });
//
//       Alert.alert("Clocked In", "Attendance recorded. Syncing in background...");
//     } catch (e: any) {
//       Alert.alert("Error", e.message);
//     } finally {
//       setActionLoading(false);
//     }
//   }
//
//   const handleClockOut = async () => {
//     // Optimistic Update
//     const updatedRecord = { ...record, clockOut: new Date().toISOString() };
//     setRecord(updatedRecord);
//
//     addOfflineAction({
//       type: 'CLOCK_OUT',
//       payload: {},
//     });
//
//     Alert.alert("Clocked Out", "Clock out recorded. Syncing in background...");
//   };
//
//   const handleStartBreak = async () => {
//     const newBreak = { breakStart: new Date().toISOString(), type: 'LUNCH' };
//     const updatedRecord = {
//       ...record,
//       breaks: [...(record?.breaks || []), newBreak],
//     };
//     setRecord(updatedRecord);
//
//     addOfflineAction({
//       type: 'START_BREAK',
//       payload: { type: 'LUNCH' },
//     });
//   };
//
//   const handleEndBreak = async () => {
//     const updatedBreaks = record?.breaks?.map((b: any) =>
//       !b.breakEnd ? { ...b, breakEnd: new Date().toISOString() } : b
//     );
//     const updatedRecord = { ...record, breaks: updatedBreaks };
//     setRecord(updatedRecord);
//
//     addOfflineAction({
//       type: 'END_BREAK',
//       payload: {},
//     });
//   };
//
//
//   if (isPending) {
//     return (
//       <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
//         <ActivityIndicator size="large" color={colors.tint} />
//       </View>
//     );
//   }
//
//   if (!session) {
//     return <Redirect href="/account" />;
//   }
//
//   useEffect(() => {
//     fetchTodayRecord();
//     // fetchCurrentLocation();
//   }, []);
//
//   useEffect(() => {
//     if (activeTab === 'report') {
//       fetchLogs();
//     }
//   }, [activeTab]);
//
//   const fetchLogs = async () => {
//     setLogsLoading(true);
//     try {
//       const { data, error } = await authClient.$fetch(`${API_BASE_URL}/logs`, {
//         method: 'POST',
//         body: { limit: 15, page: 1 },
//       });
//       if (error) throw error;
//       if (data && (data as any).success) {
//         setLogs((data as any).records || []);
//       }
//     } catch (e) {
//       console.error('Failed to fetch logs', e);
//     } finally {
//       setLogsLoading(false);
//     }
//   };
//
//   const fetchTodayRecord = async () => {
//     try {
//       const { data, error } = await authClient.$fetch(`${API_BASE_URL}/today`);
//       if (error) throw error;
//
//       if (data && (data as any).success) {
//         const payload = data as any;
//         // Only update local record from server if we don't have pending actions
//         if (syncQueue.length === 0) {
//            setRecord(payload.record);
//         }
//         setSettings(payload.settings);
//         if (payload.userWorkMode) {
//           setUserWorkMode(payload.userWorkMode);
//         }
//       }
//     } catch (e) {
//       console.error('Failed to fetch attendance', e);
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   // const fetchCurrentLocation = async () => {
//   //   try {
//   //     const { status } = await Location.requestForegroundPermissionsAsync();
//   //     if (status !== 'granted') return;
//
//   //     const location = await Location.getCurrentPositionAsync({
//   //       accuracy: Location.Accuracy.High
//   //     });
//   //     setCachedLocation({
//   //       latitude: location.coords.latitude,
//   //       longitude: location.coords.longitude,
//   //     })
//   //     // const geocode = await Location.reverseGeocodeAsync({
//   //     //   latitude: location.coords.latitude,
//   //     //   longitude: location.coords.longitude,
//   //     // });
//
//   //     // if (geocode && geocode.length > 0) {
//   //     // const place = geocode[0];
//   //     // const name = [place.street, place.city, place.region].filter(Boolean).join(', ');
//   //     // setCurrentLocationName(name || 'Unknown Location');
//   //     // }
//   //   } catch (e) {
//   //     console.error('Failed to get location', e);
//   //   }
//   // };
//
//   // const captureSelfie = async () => {
//   //   const result = await ImagePicker.launchCameraAsync({
//   //     mediaTypes: 'images',
//   //     allowsEditing: false,
//   //     quality: 0.3, // Reduced for faster upload
//   //     base64: false,
//   //     cameraType: ImagePicker.CameraType.front,
//   //   });
//
//   //   if (result.canceled) {
//   //     return null;
//   //   }
//
//   //   // Upload to cloudinary
//   //   try {
//   //     const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dww8qwwby'; // fallback or env
//   //     const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'crm_upload_preset'; // fallback or env
//
//   //     // const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
//   //     const formData = new FormData();
//   //     formData.append('file', {
//   //       uri: result.assets[0].uri,
//   //       type: 'image/jpeg',
//   //       name: 'selfie.jpg',
//   //     } as any);
//   //     formData.append('upload_preset', uploadPreset);
//
//   //     const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
//   //       method: 'POST',
//   //       body: formData,
//   //     });
//
//   //     if (!response.ok) throw new Error('Failed to upload');
//   //     const data = await response.json();
//   //     return { url: data.secure_url, publicId: data.public_id };
//   //   } catch (e) {
//   //     Alert.alert('Upload failed', 'Failed to upload selfie.');
//   //     return null;
//   //   }
//   // };
//
//   const handleClockIn = async () => {
//     try {
//       const latestLocation = await refreshLocation();
//
//       if (!latestLocation) {
//         Alert.alert(
//           "Location Error",
//           "Unable to get your current location."
//         );
//         return;
//       }
//       router.push("/attendance/selfie");
//     } catch (e: any) {
//       Alert.alert('Error', e?.message || 'An unexpected error occurred');
//     }
//   };
//
//
//
//   const isClockedIn = !!record && !record.clockOut;
//   const openBreak = record?.breaks?.find((b: any) => !b.breakEnd);
//   const isOnBreak = !!openBreak;
//
//   const completedLogs = logs.filter(l => l.clockOut);
//   const totalDays = completedLogs.length;
//   const totalPresent = completedLogs.filter(l => l.status === 'PRESENT').length;
//   const totalLate = completedLogs.filter(l => l.status === 'LATE').length;
//   const totalHalfDay = completedLogs.filter(l => l.status === 'HALF_DAY').length;
//   const totalMinutes = completedLogs.reduce((acc, curr) => acc + (curr.workMinutes || 0), 0);
//   const avgHoursPerDay = totalDays > 0 ? (totalMinutes / 60 / totalDays).toFixed(1) : '0';
//
//
//   return (
//     <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
//       {/* Tab Switcher */}
//       <View style={[styles.tabContainer, { backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea' }]}>
//         <TouchableOpacity
//           style={[styles.tabButton, activeTab === 'punch' && { backgroundColor: isDark ? '#48484a' : '#fff' }]}
//           onPress={() => setActiveTab('punch')}
//         >
//           <Text style={[styles.tabText, activeTab === 'punch' ? { color: colors.text, fontWeight: 'bold' } : { color: '#8e8e93' }]}>Punch Clock</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={[styles.tabButton, activeTab === 'report' && { backgroundColor: isDark ? '#48484a' : '#fff' }]}
//           onPress={() => setActiveTab('report')}
//         >
//           <Text style={[styles.tabText, activeTab === 'report' ? { color: colors.text, fontWeight: 'bold' } : { color: '#8e8e93' }]}>Report</Text>
//         </TouchableOpacity>
//       </View>
//
//       {activeTab === 'punch' ? (
//         <>
//           <LiveClock />
//
//           {syncQueue.length > 0 && (
//             <View style={[styles.syncStatus, { backgroundColor: colors.tint + '20' }]}>
//                <ActivityIndicator size="small" color={colors.tint} />
//                <Text style={{ color: colors.tint, fontSize: 12 }}>
//                  {isSyncing ? "Syncing..." : `${syncQueue.length} items pending sync`}
//                </Text>
//             </View>
//           )}
//
//           {!isClockedIn && !record?.clockOut && (
//             <View style={styles.workModeContainer}>
//               <Text style={[styles.label, { color: colors.text, marginBottom: 8 }]}>Assigned Work Mode</Text>
//               <View style={[styles.modeButton, { backgroundColor: colors.tint, borderColor: colors.tint }]}>
//                 <MaterialIcons
//                   name={userWorkMode === 'OFFICE' ? 'business' : userWorkMode === 'REMOTE' ? 'home-work' : 'devices'}
//                   size={20} color="#fff"
//                 />
//                 <Text style={[styles.modeText, { color: '#fff' }]}>{userWorkMode}</Text>
//               </View>
//
//               {/* {currentLocationName && (
//                 <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6, opacity: 0.8 }}>
//                   <MaterialIcons name="location-on" size={16} color={colors.text} />
//                   <Text style={{ color: colors.text, fontSize: 14 }}>{currentLocationName}</Text>
//                 </View>
//               )} */}
//             </View>
//           )}
//
//           <View style={styles.actionContainer}>
//             {record?.clockOut ? (
//               <View style={[styles.statusCard, { backgroundColor: isDark ? '#1a3a2a' : '#d1fae5' }]}>
//                 <MaterialIcons name="check-circle" size={32} color={isDark ? '#6ee7b7' : '#047857'} />
//                 <Text style={[styles.statusTitle, { color: isDark ? '#6ee7b7' : '#047857' }]}>Shift Completed</Text>
//                 <Text style={[styles.statusSub, { color: isDark ? '#6ee7b7' : '#047857' }]}>You have successfully clocked out for the day.</Text>
//               </View>
//             ) : !isClockedIn ? (
//               <TouchableOpacity
//                 style={[styles.mainButton, { backgroundColor: colors.tint }]}
//                 onPress={handleClockIn}
//                 disabled={actionLoading}
//               >
//                 {actionLoading ? <ActivityIndicator color="#fff" /> : (
//                   <>
//                     <MaterialIcons name="login" size={24} color="#fff" />
//                     <Text style={styles.mainButtonText}>Clock In</Text>
//                   </>
//                 )}
//               </TouchableOpacity>
//             ) : (
//               <View style={{ gap: 16 }}>
//                 <View style={[styles.statusCard, { backgroundColor: isDark ? '#3a3d40' : '#f8f9fa' }]}>
//                   <Text style={[styles.statusTitle, { color: colors.text }]}>Currently {isOnBreak ? 'On Break' : 'Clocked In'}</Text>
//                   <Text style={[styles.statusSub, { color: isDark ? '#ccc' : '#666' }]}>
//                     Started at {new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                   </Text>
//                 </View>
//
//                 {isOnBreak ? (
//                   <TouchableOpacity
//                     style={[styles.secondaryButton, { backgroundColor: '#f59e0b' }]}
//                     onPress={handleEndBreak}
//                     disabled={actionLoading}
//                   >
//                     {actionLoading ? <ActivityIndicator color="#fff" /> : (
//                       <>
//                         <MaterialIcons name="free-breakfast" size={24} color="#fff" />
//                         <Text style={styles.mainButtonText}>End Break</Text>
//                       </>
//                     )}
//                   </TouchableOpacity>
//                 ) : (
//                   <TouchableOpacity
//                     style={[styles.secondaryButton, { backgroundColor: '#3b82f6' }]}
//                     onPress={handleStartBreak}
//                     disabled={actionLoading}
//                   >
//                     {actionLoading ? <ActivityIndicator color="#fff" /> : (
//                       <>
//                         <MaterialIcons name="free-breakfast" size={24} color="#fff" />
//                         <Text style={styles.mainButtonText}>Start Break</Text>
//                       </>
//                     )}
//                   </TouchableOpacity>
//                 )}
//
//                 <TouchableOpacity
//                   style={[styles.mainButton, { backgroundColor: '#dc2626', marginTop: 16 }]}
//                   onPress={handleClockOut}
//                   disabled={actionLoading || isOnBreak}
//                 >
//                   {actionLoading ? <ActivityIndicator color="#fff" /> : (
//                     <>
//                       <MaterialIcons name="logout" size={24} color="#fff" />
//                       <Text style={styles.mainButtonText}>Clock Out</Text>
//                     </>
//                   )}
//                 </TouchableOpacity>
//               </View>
//             )}
//           </View>
//         </>
//       ) : (
//         <View style={styles.reportContainer}>
//           {logsLoading ? (
//             <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
//           ) : completedLogs.length === 0 ? (
//             <Text style={[styles.noLogsText, { color: isDark ? '#aaa' : '#666' }]}>No completed attendance records found.</Text>
//           ) : (
//             <>
//               {/* Overall Summary Card */}
//               <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1c1c1e' : '#fff', borderColor: isDark ? '#333' : '#e5e5ea' }]}>
//                 <Text style={[styles.summaryTitle, { color: colors.text }]}>Overall Performance</Text>
//
//                 <View style={styles.summaryGrid}>
//                   <View style={styles.summaryItem}>
//                     <Text style={[styles.summaryValue, { color: '#10b981' }]}>{totalPresent}</Text>
//                     <Text style={[styles.summaryLabel, { color: isDark ? '#aaa' : '#666' }]}>Present</Text>
//                   </View>
//                   <View style={styles.summaryItem}>
//                     <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{totalLate}</Text>
//                     <Text style={[styles.summaryLabel, { color: isDark ? '#aaa' : '#666' }]}>Late</Text>
//                   </View>
//                   <View style={styles.summaryItem}>
//                     <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{totalHalfDay}</Text>
//                     <Text style={[styles.summaryLabel, { color: isDark ? '#aaa' : '#666' }]}>Half Day</Text>
//                   </View>
//                   <View style={styles.summaryItem}>
//                     <Text style={[styles.summaryValue, { color: colors.tint }]}>{avgHoursPerDay}h</Text>
//                     <Text style={[styles.summaryLabel, { color: isDark ? '#aaa' : '#666' }]}>Avg / Day</Text>
//                   </View>
//                 </View>
//               </View>
//
//               <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent History</Text>
//
//               {completedLogs.length === 0 ? (
//                 <Text style={[styles.noLogsText, { color: isDark ? '#aaa' : '#666', marginTop: 16 }]}>No completed shifts yet.</Text>
//               ) : (
//                 completedLogs.map((log) => {
//                   const logDate = new Date(log.date);
//                   const hrs = Math.floor(log.workMinutes / 60);
//                   const mins = log.workMinutes % 60;
//                   return (
//                     <View key={log.id} style={[styles.logCard, { backgroundColor: isDark ? '#1c1c1e' : '#fff', borderColor: isDark ? '#333' : '#e5e5ea' }]}>
//                       <View style={styles.logHeader}>
//                         <Text style={[styles.logDate, { color: colors.text }]}>
//                           {logDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
//                         </Text>
//                         <View style={[styles.statusBadge,
//                         log.status === 'PRESENT' ? { backgroundColor: '#10b98120' } :
//                           log.status === 'LATE' ? { backgroundColor: '#f59e0b20' } :
//                             { backgroundColor: '#ef444420' }
//                         ]}>
//                           <Text style={[styles.statusBadgeText,
//                           log.status === 'PRESENT' ? { color: '#10b981' } :
//                             log.status === 'LATE' ? { color: '#f59e0b' } :
//                               { color: '#ef4444' }
//                           ]}>{log.status}</Text>
//                         </View>
//                       </View>
//
//                       <View style={styles.logDetails}>
//                         <View style={styles.logDetailRow}>
//                           <MaterialIcons name="login" size={16} color={colors.icon} />
//                           <Text style={[styles.logDetailText, { color: isDark ? '#ccc' : '#666' }]}>
//                             In: {new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                           </Text>
//                         </View>
//                         <View style={styles.logDetailRow}>
//                           <MaterialIcons name="logout" size={16} color={colors.icon} />
//                           <Text style={[styles.logDetailText, { color: isDark ? '#ccc' : '#666' }]}>
//                             Out: {log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
//                           </Text>
//                         </View>
//                       </View>
//
//                       <View style={styles.logFooter}>
//                         <Text style={[styles.workHoursText, { color: colors.text }]}>
//                           <MaterialIcons name="schedule" size={16} color={colors.tint} /> {hrs}h {mins}m
//                         </Text>
//                         <Text style={[styles.workModeLabel, { color: isDark ? '#888' : '#999' }]}>{log.workMode}</Text>
//                       </View>
//                       {log.locationName && (
//                         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
//                           <MaterialIcons name="location-on" size={12} color={isDark ? '#888' : '#999'} />
//                           <Text style={{ fontSize: 12, color: isDark ? '#888' : '#999' }}>{log.locationName}</Text>
//                         </View>
//                       )}
//                     </View>
//                   );
//                 })
//               )}
//             </>
//           )}
//         </View>
//       )}
//
//
//     </ScrollView>
//   );
// }
//
//
//
// const styles = StyleSheet.create({
//   syncStatus: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     padding: 8,
//     borderRadius: 8,
//     marginBottom: 16,
//     justifyContent: 'center',
//   },
//   container: {
//     flex: 1,
//   },
//   timeText: {
//     fontSize: 48,
//     fontWeight: 'bold',
//     letterSpacing: 2,
//   },
//   dateText: {
//     fontSize: 16,
//     marginTop: 8,
//   },
//   workModeContainer: {
//     marginBottom: 32,
//   },
//   label: {
//     fontSize: 14,
//     fontWeight: '600',
//     marginBottom: 12,
//   },
//   modeButtons: {
//     flexDirection: 'row',
//     gap: 12,
//   },
//   modeButton: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 12,
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 12,
//     gap: 8,
//   },
//   modeText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#666',
//   },
//   actionContainer: {
//     marginTop: 16,
//   },
//   mainButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 16,
//     borderRadius: 16,
//     gap: 12,
//   },
//   secondaryButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 16,
//     borderRadius: 16,
//     gap: 12,
//   },
//   mainButtonText: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   statusCard: {
//     padding: 24,
//     borderRadius: 16,
//     alignItems: 'center',
//     gap: 8,
//   },
//   statusTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//   },
//   statusSub: {
//     fontSize: 14,
//     textAlign: 'center',
//   },
//   tabContainer: {
//     flexDirection: 'row',
//     borderRadius: 8,
//     padding: 4,
//     marginBottom: 8,
//   },
//   tabButton: {
//     flex: 1,
//     paddingVertical: 10,
//     borderRadius: 6,
//     alignItems: 'center',
//   },
//   tabText: {
//     fontSize: 14,
//     fontWeight: '500',
//   },
//   reportContainer: {
//     marginTop: 16,
//     gap: 16,
//   },
//   summaryCard: {
//     padding: 20,
//     borderRadius: 16,
//     borderWidth: 1,
//     marginBottom: 8,
//   },
//   summaryTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 16,
//   },
//   summaryGrid: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   summaryItem: {
//     alignItems: 'center',
//     flex: 1,
//   },
//   summaryValue: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 4,
//   },
//   summaryLabel: {
//     fontSize: 12,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 8,
//     marginTop: 8,
//   },
//   noLogsText: {
//     textAlign: 'center',
//     marginTop: 40,
//     fontSize: 16,
//   },
//   logCard: {
//     padding: 16,
//     borderRadius: 12,
//     borderWidth: 1,
//     gap: 12,
//   },
//   logHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   logDate: {
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   statusBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   statusBadgeText: {
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   logDetails: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   logDetailRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//   },
//   logDetailText: {
//     fontSize: 14,
//   },
//   logFooter: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     borderTopWidth: 1,
//     borderTopColor: '#e5e5ea',
//     paddingTop: 12,
//     marginTop: 4,
//   },
//   workHoursText: {
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   workModeLabel: {
//     fontSize: 12,
//   },
// });
