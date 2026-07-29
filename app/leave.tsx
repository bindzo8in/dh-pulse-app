import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authClient } from '@/lib/auth-client';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';

const API_BASE_URL = `${process.env.EXPO_PUBLIC_BETTER_AUTH_SERVER_URL}/api`;

export default function LeaveScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [type, setType] = useState('CASUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchLeaves();
    }
  }, [activeTab]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const { data } = await authClient.$fetch(`${API_BASE_URL}/leave/history`, { method: 'POST' });
      if (data && (data as any).success) {
        setLeaves((data as any).leaves || []);
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate || !reason) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await authClient.$fetch(`${API_BASE_URL}/leave/submit`, {
        method: 'POST',
        body: { type, startDate, endDate, reason }
      });

      if (data && (data as any).success) {
        Alert.alert('Success', 'Leave request submitted successfully');
        setStartDate('');
        setEndDate('');
        setReason('');
        setActiveTab('history');
      } else {
        Alert.alert('Error', (data as any)?.error || 'Failed to submit request');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Management</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'request' && { borderBottomColor: colors.tint, borderBottomWidth: 3 }]}
          onPress={() => setActiveTab('request')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'request' ? colors.tint : colors.text }]}>Request Leave</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: colors.tint, borderBottomWidth: 3 }]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'history' ? colors.tint : colors.text }]}>History</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'request' ? (
          <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
            <Text style={[styles.label, { color: colors.text }]}>Leave Type</Text>
            <View style={styles.typeRow}>
              {['CASUAL', 'SICK', 'ANNUAL', 'UNPAID'].map(t => (
                <TouchableOpacity 
                  key={t}
                  style={[styles.typeChip, type === t ? { backgroundColor: colors.tint } : { backgroundColor: isDark ? '#333' : '#eee' }]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.typeText, type === t ? { color: '#fff' } : { color: colors.text }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.text }]}>Start Date (YYYY-MM-DD)</Text>
            <TextInput 
              style={[styles.input, { color: colors.text, borderColor: isDark ? '#333' : '#ddd' }]} 
              placeholder="e.g. 2026-08-01"
              placeholderTextColor={isDark ? '#666' : '#999'}
              value={startDate}
              onChangeText={setStartDate}
            />

            <Text style={[styles.label, { color: colors.text }]}>End Date (YYYY-MM-DD)</Text>
            <TextInput 
              style={[styles.input, { color: colors.text, borderColor: isDark ? '#333' : '#ddd' }]} 
              placeholder="e.g. 2026-08-03"
              placeholderTextColor={isDark ? '#666' : '#999'}
              value={endDate}
              onChangeText={setEndDate}
            />

            <Text style={[styles.label, { color: colors.text }]}>Reason</Text>
            <TextInput 
              style={[styles.input, styles.textArea, { color: colors.text, borderColor: isDark ? '#333' : '#ddd' }]} 
              placeholder="Why are you taking leave?"
              placeholderTextColor={isDark ? '#666' : '#999'}
              multiline
              numberOfLines={4}
              value={reason}
              onChangeText={setReason}
            />

            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: colors.tint }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Request</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {loading ? (
              <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
            ) : leaves.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.text }]}>No leave requests found.</Text>
            ) : (
              leaves.map(leave => (
                <View key={leave.id} style={[styles.leaveCard, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
                  <View style={styles.leaveHeader}>
                    <Text style={[styles.leaveType, { color: colors.text }]}>{leave.type}</Text>
                    <View style={[
                      styles.statusBadge, 
                      leave.status === 'APPROVED' ? { backgroundColor: '#10b98120' } :
                      leave.status === 'REJECTED' ? { backgroundColor: '#ef444420' } :
                      { backgroundColor: '#f59e0b20' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        leave.status === 'APPROVED' ? { color: '#10b981' } :
                        leave.status === 'REJECTED' ? { color: '#ef4444' } :
                        { color: '#f59e0b' }
                      ]}>{leave.status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.leaveDates, { color: isDark ? '#aaa' : '#666' }]}>
                    {format(new Date(leave.startDate), 'MMM d, yyyy')} - {format(new Date(leave.endDate), 'MMM d, yyyy')}
                  </Text>
                  <Text style={[styles.leaveReason, { color: colors.text }]}>{leave.reason}</Text>
                  {leave.managerComment && (
                    <View style={styles.commentBox}>
                      <Text style={styles.commentTitle}>Manager Comment:</Text>
                      <Text style={styles.commentText}>{leave.managerComment}</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  content: {
    padding: 20,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  typeText: {
    fontWeight: '600',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  leaveCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leaveType: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  leaveDates: {
    fontSize: 14,
    marginBottom: 12,
  },
  leaveReason: {
    fontSize: 15,
    lineHeight: 22,
  },
  commentBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
  },
  commentTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
  }
});
