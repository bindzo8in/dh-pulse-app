import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authClient } from '@/lib/auth-client';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Redirect } from 'expo-router';

const API_BASE_URL = `${process.env.EXPO_PUBLIC_BETTER_AUTH_SERVER_URL}/api/attendance`;

export default function AttendanceScreen() {
  const { data: session, isPending } = authClient.useSession();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const [time, setTime] = useState(new Date());
  const [record, setRecord] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [userWorkMode, setUserWorkMode] = useState<'OFFICE' | 'REMOTE' | 'HYBRID'>('OFFICE');
  const [currentLocationName, setCurrentLocationName] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'punch' | 'report'>('punch');
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchTodayRecord();
    fetchCurrentLocation();
  }, []);

  useEffect(() => {
    if (activeTab === 'report') {
      fetchLogs();
    }
  }, [activeTab]);

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
        setRecord(payload.record);
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

  const fetchCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const name = [place.street, place.city, place.region].filter(Boolean).join(', ');
        setCurrentLocationName(name || 'Unknown Location');
      }
    } catch (e) {
      console.error('Failed to get location', e);
    }
  };

  const captureSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required for selfies.');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 0.5,
      base64: true,
    });

    if (result.canceled || !result.assets[0].base64) {
      return null;
    }

    // Upload to cloudinary
    try {
      const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dww8qwwby'; // fallback or env
      const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'crm_upload_preset'; // fallback or env

      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const formData = new FormData();
      formData.append('file', base64Img);
      formData.append('upload_preset', uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload');
      const data = await response.json();
      return { url: data.secure_url, publicId: data.public_id };
    } catch (e) {
      Alert.alert('Upload failed', 'Failed to upload selfie.');
      return null;
    }
  };

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      // 1. Location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required to clock in.');
        setActionLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      // 2. Selfie
      const selfieData = await captureSelfie();
      if (!selfieData) {
        setActionLoading(false);
        return;
      }

      // 3. Submit
      let locName = currentLocationName;
      if (!locName) {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (geocode && geocode.length > 0) {
          const place = geocode[0];
          locName = [place.street, place.city, place.region].filter(Boolean).join(', ');
        }
      }

      const { data, error } = await authClient.$fetch(`${API_BASE_URL}/clock-in`, {
        method: 'POST',
        body: {
          workMode: userWorkMode,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          locationName: locName,
          selfieUrl: selfieData.url,
          selfiePublicId: selfieData.publicId,
        },
      });

      if (error) throw error;

      if (data && (data as any).success) {
        setRecord((data as any).record);
        Alert.alert('Success', 'Clocked in successfully!');
      } else {
        Alert.alert('Error', (data as any)?.error || 'Failed to clock in');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'An unexpected error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await authClient.$fetch(`${API_BASE_URL}/clock-out`, {
        method: 'POST',
        body: {},
      });

      if (error) throw error;

      if (data && (data as any).success) {
        setRecord((data as any).record);
        Alert.alert('Success', 'Clocked out successfully!');
      } else {
        Alert.alert('Error', (data as any)?.error || 'Failed to clock out');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'An unexpected error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await authClient.$fetch(`${API_BASE_URL}/start-break`, {
        method: 'POST',
        body: { type: 'LUNCH' },
      });

      if (error) throw error;

      if (data && (data as any).success) {
        fetchTodayRecord();
      } else {
        Alert.alert('Error', (data as any)?.error || 'Failed to start break');
      }
    } catch (e) {
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await authClient.$fetch(`${API_BASE_URL}/end-break`, {
        method: 'POST',
        body: {},
      });

      if (error) throw error;

      if (data && (data as any).success) {
        fetchTodayRecord();
      } else {
        Alert.alert('Error', (data as any)?.error || 'Failed to end break');
      }
    } catch (e) {
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

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

  if (isPending) return null;

  if (!session) {
    return <Redirect href="/account" />;
  }
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea' }]}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'punch' && { backgroundColor: isDark ? '#48484a' : '#fff' }]}
          onPress={() => setActiveTab('punch')}
        >
          <Text style={[styles.tabText, activeTab === 'punch' ? { color: colors.text, fontWeight: 'bold' } : { color: '#8e8e93' }]}>Punch Clock</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'report' && { backgroundColor: isDark ? '#48484a' : '#fff' }]}
          onPress={() => setActiveTab('report')}
        >
          <Text style={[styles.tabText, activeTab === 'report' ? { color: colors.text, fontWeight: 'bold' } : { color: '#8e8e93' }]}>Report</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'punch' ? (
        <>
          <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 40 }}>
            <Text style={[styles.timeText, { color: colors.text }]}>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Text>
            <Text style={[styles.dateText, { color: isDark ? '#ccc' : '#666' }]}>
              {time.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </View>

          {!isClockedIn && !record?.clockOut && (
            <View style={styles.workModeContainer}>
              <Text style={[styles.label, { color: colors.text, marginBottom: 8 }]}>Assigned Work Mode</Text>
              <View style={[styles.modeButton, { backgroundColor: colors.tint, borderColor: colors.tint }]}>
                <MaterialIcons
                  name={userWorkMode === 'OFFICE' ? 'business' : userWorkMode === 'REMOTE' ? 'home-work' : 'devices'}
                  size={20} color="#fff"
                />
                <Text style={[styles.modeText, { color: '#fff' }]}>{userWorkMode}</Text>
              </View>

              {currentLocationName && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6, opacity: 0.8 }}>
                  <MaterialIcons name="location-on" size={16} color={colors.text} />
                  <Text style={{ color: colors.text, fontSize: 14 }}>{currentLocationName}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.actionContainer}>
            {record?.clockOut ? (
              <View style={[styles.statusCard, { backgroundColor: isDark ? '#1a3a2a' : '#d1fae5' }]}>
                <MaterialIcons name="check-circle" size={32} color={isDark ? '#6ee7b7' : '#047857'} />
                <Text style={[styles.statusTitle, { color: isDark ? '#6ee7b7' : '#047857' }]}>Shift Completed</Text>
                <Text style={[styles.statusSub, { color: isDark ? '#6ee7b7' : '#047857' }]}>You have successfully clocked out for the day.</Text>
              </View>
            ) : !isClockedIn ? (
              <TouchableOpacity
                style={[styles.mainButton, { backgroundColor: colors.tint }]}
                onPress={handleClockIn}
                disabled={actionLoading}
              >
                {actionLoading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <MaterialIcons name="login" size={24} color="#fff" />
                    <Text style={styles.mainButtonText}>Clock In</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={{ gap: 16 }}>
                <View style={[styles.statusCard, { backgroundColor: isDark ? '#3a3d40' : '#f8f9fa' }]}>
                  <Text style={[styles.statusTitle, { color: colors.text }]}>Currently {isOnBreak ? 'On Break' : 'Clocked In'}</Text>
                  <Text style={[styles.statusSub, { color: isDark ? '#ccc' : '#666' }]}>
                    Started at {new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {isOnBreak ? (
                  <TouchableOpacity
                    style={[styles.secondaryButton, { backgroundColor: '#f59e0b' }]}
                    onPress={handleEndBreak}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <MaterialIcons name="free-breakfast" size={24} color="#fff" />
                        <Text style={styles.mainButtonText}>End Break</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.secondaryButton, { backgroundColor: '#3b82f6' }]}
                    onPress={handleStartBreak}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <MaterialIcons name="free-breakfast" size={24} color="#fff" />
                        <Text style={styles.mainButtonText}>Start Break</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.mainButton, { backgroundColor: '#dc2626', marginTop: 16 }]}
                  onPress={handleClockOut}
                  disabled={actionLoading || isOnBreak}
                >
                  {actionLoading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <MaterialIcons name="logout" size={24} color="#fff" />
                      <Text style={styles.mainButtonText}>Clock Out</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      ) : (
        <View style={styles.reportContainer}>
          {logsLoading ? (
            <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
          ) : completedLogs.length === 0 ? (
            <Text style={[styles.noLogsText, { color: isDark ? '#aaa' : '#666' }]}>No completed attendance records found.</Text>
          ) : (
            <>
              {/* Overall Summary Card */}
              <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1c1c1e' : '#fff', borderColor: isDark ? '#333' : '#e5e5ea' }]}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>Overall Performance</Text>

                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: '#10b981' }]}>{totalPresent}</Text>
                    <Text style={[styles.summaryLabel, { color: isDark ? '#aaa' : '#666' }]}>Present</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{totalLate}</Text>
                    <Text style={[styles.summaryLabel, { color: isDark ? '#aaa' : '#666' }]}>Late</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{totalHalfDay}</Text>
                    <Text style={[styles.summaryLabel, { color: isDark ? '#aaa' : '#666' }]}>Half Day</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: colors.tint }]}>{avgHoursPerDay}h</Text>
                    <Text style={[styles.summaryLabel, { color: isDark ? '#aaa' : '#666' }]}>Avg / Day</Text>
                  </View>
                </View>
              </View>

              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent History</Text>

              {completedLogs.length === 0 ? (
                <Text style={[styles.noLogsText, { color: isDark ? '#aaa' : '#666', marginTop: 16 }]}>No completed shifts yet.</Text>
              ) : (
                completedLogs.map((log) => {
                  const logDate = new Date(log.date);
                  const hrs = Math.floor(log.workMinutes / 60);
                  const mins = log.workMinutes % 60;
                  return (
                    <View key={log.id} style={[styles.logCard, { backgroundColor: isDark ? '#1c1c1e' : '#fff', borderColor: isDark ? '#333' : '#e5e5ea' }]}>
                      <View style={styles.logHeader}>
                        <Text style={[styles.logDate, { color: colors.text }]}>
                          {logDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                        <View style={[styles.statusBadge,
                        log.status === 'PRESENT' ? { backgroundColor: '#10b98120' } :
                          log.status === 'LATE' ? { backgroundColor: '#f59e0b20' } :
                            { backgroundColor: '#ef444420' }
                        ]}>
                          <Text style={[styles.statusBadgeText,
                          log.status === 'PRESENT' ? { color: '#10b981' } :
                            log.status === 'LATE' ? { color: '#f59e0b' } :
                              { color: '#ef4444' }
                          ]}>{log.status}</Text>
                        </View>
                      </View>

                      <View style={styles.logDetails}>
                        <View style={styles.logDetailRow}>
                          <MaterialIcons name="login" size={16} color={colors.icon} />
                          <Text style={[styles.logDetailText, { color: isDark ? '#ccc' : '#666' }]}>
                            In: {new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <View style={styles.logDetailRow}>
                          <MaterialIcons name="logout" size={16} color={colors.icon} />
                          <Text style={[styles.logDetailText, { color: isDark ? '#ccc' : '#666' }]}>
                            Out: {log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.logFooter}>
                        <Text style={[styles.workHoursText, { color: colors.text }]}>
                          <MaterialIcons name="schedule" size={16} color={colors.tint} /> {hrs}h {mins}m
                        </Text>
                        <Text style={[styles.workModeLabel, { color: isDark ? '#888' : '#999' }]}>{log.workMode}</Text>
                      </View>
                      {log.locationName && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <MaterialIcons name="location-on" size={12} color={isDark ? '#888' : '#999'} />
                          <Text style={{ fontSize: 12, color: isDark ? '#888' : '#999' }}>{log.locationName}</Text>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
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
  timeText: {
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  dateText: {
    fontSize: 16,
    marginTop: 8,
  },
  workModeContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    gap: 8,
  },
  modeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  actionContainer: {
    marginTop: 16,
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusSub: {
    fontSize: 14,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  reportContainer: {
    marginTop: 16,
    gap: 16,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
  },
  noLogsText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  logCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logDate: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
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
    borderTopColor: '#e5e5ea',
    paddingTop: 12,
    marginTop: 4,
  },
  workHoursText: {
    fontSize: 14,
    fontWeight: '600',
  },
  workModeLabel: {
    fontSize: 12,
  },
});
