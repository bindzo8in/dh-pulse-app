import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Linking from 'expo-linking';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { authClient } from '@/lib/auth-client';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Redirect, useGlobalSearchParams, useRouter } from 'expo-router';

function AccountDetails({ session }: { session: any }) {
  const { refetch } = authClient.useSession();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const [loggingOut, setLoggingOut] = useState(false);

  const user = session?.user;
  const dynamicStyles = getDynamicStyles(isDark, colors);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user?.name) {
      setEditName(user.name);
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    setUpdateError('');
    setUpdateSuccess('');

    if (!editName.trim()) {
      setUpdateError('Name cannot be empty');
      return;
    }

    if (editName === user?.name) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      const res = await authClient.updateUser({
        name: editName,
      });

      if (res.error) {
        setUpdateError(res.error.message ?? 'Failed to update profile');
      } else {
        setUpdateSuccess('Profile updated successfully');
        setIsEditing(false);
        // Refresh session to get updated user data
        await refetch();

        setTimeout(() => setUpdateSuccess(''), 3000);
      }
    } catch (e: any) {
      setUpdateError(e?.message ?? 'Something went wrong');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }
    if (!newPassword) {
      setPasswordError('Please enter a new password');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (res.error) {
        setPasswordError(res.error.message ?? 'Failed to change password');
      } else {
        setPasswordSuccess('Password changed successfully');
        setIsChangingPassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');

        setTimeout(() => setPasswordSuccess(''), 3000);
      }
    } catch (e: any) {
      setPasswordError(e?.message ?? 'Something went wrong');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await authClient.signOut();
    } catch {
      // ignore
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <ScrollView
      style={dynamicStyles.container}
      contentContainerStyle={dynamicStyles.accountScrollContent}
    >
      {/* Avatar / Initials */}
      <View style={dynamicStyles.avatarContainer}>
        <View style={dynamicStyles.avatar}>
          <Text style={dynamicStyles.avatarText}>
            {user?.name
              ? user.name
                .split(' ')
                .map((w: string) => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)
              : '?'}
          </Text>
        </View>
        <Text style={dynamicStyles.userName}>{user?.name ?? 'User'}</Text>
        <Text style={dynamicStyles.userEmail}>{user?.email ?? ''}</Text>
      </View>

      {/* Account Info Card */}
      <View style={dynamicStyles.card}>
        <View style={dynamicStyles.cardHeader}>
          <Text style={dynamicStyles.sectionTitle}>Account Information</Text>
          {!isEditing ? (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={dynamicStyles.editLink}>Edit</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {updateError ? (
          <View style={dynamicStyles.errorContainer}>
            <Text style={dynamicStyles.errorText}>{updateError}</Text>
          </View>
        ) : null}

        {updateSuccess ? (
          <View style={[dynamicStyles.errorContainer, { backgroundColor: isDark ? '#1a3a2a' : '#d1fae5' }]}>
            <Text style={[dynamicStyles.errorText, { color: isDark ? '#6ee7b7' : '#047857' }]}>
              {updateSuccess}
            </Text>
          </View>
        ) : null}

        <View style={dynamicStyles.infoRow}>
          <Text style={dynamicStyles.infoLabel}>Name</Text>
          {isEditing ? (
            <TextInput
              style={[dynamicStyles.input, { flex: 1, marginLeft: 16, paddingVertical: 8 }]}
              value={editName}
              onChangeText={setEditName}
              autoCapitalize="words"
              placeholder="Your name"
              placeholderTextColor={isDark ? '#555' : '#aaa'}
            />
          ) : (
            <Text style={dynamicStyles.infoValue}>{user?.name ?? '—'}</Text>
          )}
        </View>

        <View style={dynamicStyles.divider} />

        <View style={dynamicStyles.infoRow}>
          <Text style={dynamicStyles.infoLabel}>Email</Text>
          <Text style={dynamicStyles.infoValue}>{user?.email ?? '—'}</Text>
        </View>

        <View style={dynamicStyles.divider} />

        <View style={dynamicStyles.infoRow}>
          <Text style={dynamicStyles.infoLabel}>Role</Text>
          <Text style={[dynamicStyles.infoValue, { textTransform: 'capitalize' }]}>
            {(user as any)?.role ?? '—'}
          </Text>
        </View>

        <View style={dynamicStyles.divider} />

        <View style={dynamicStyles.infoRow}>
          <Text style={dynamicStyles.infoLabel}>Department</Text>
          <Text style={[dynamicStyles.infoValue, { textTransform: 'capitalize' }]}>
            {(user as any)?.department ?? '—'}
          </Text>
        </View>

        {isEditing && (
          <View style={dynamicStyles.editActions}>
            <TouchableOpacity
              style={[dynamicStyles.editActionButton, { backgroundColor: isDark ? '#3a3d40' : '#e9ecef' }]}
              onPress={() => {
                setIsEditing(false);
                setEditName(user?.name ?? '');
                setUpdateError('');
              }}
              disabled={isUpdating}
            >
              <Text style={[dynamicStyles.editActionText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[dynamicStyles.editActionButton, { backgroundColor: colors.tint }]}
              onPress={handleUpdateProfile}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[dynamicStyles.editActionText, { color: '#fff' }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Security Card */}
      <View style={[dynamicStyles.card, { marginTop: 16 }]}>
        <View style={dynamicStyles.cardHeader}>
          <Text style={dynamicStyles.sectionTitle}>Security</Text>
          {!isChangingPassword ? (
            <TouchableOpacity onPress={() => setIsChangingPassword(true)}>
              <Text style={dynamicStyles.editLink}>Change Password</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {passwordError ? (
          <View style={dynamicStyles.errorContainer}>
            <Text style={dynamicStyles.errorText}>{passwordError}</Text>
          </View>
        ) : null}

        {passwordSuccess ? (
          <View style={[dynamicStyles.errorContainer, { backgroundColor: isDark ? '#1a3a2a' : '#d1fae5' }]}>
            <Text style={[dynamicStyles.errorText, { color: isDark ? '#6ee7b7' : '#047857' }]}>
              {passwordSuccess}
            </Text>
          </View>
        ) : null}

        {isChangingPassword ? (
          <View>
            <View style={dynamicStyles.inputGroup}>
              <Text style={dynamicStyles.label}>Current Password</Text>
              <View style={dynamicStyles.passwordContainer}>
                <TextInput
                  style={dynamicStyles.passwordInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  placeholder="••••••••"
                  placeholderTextColor={isDark ? '#555' : '#aaa'}
                />
                {currentPassword.length > 0 && (
                  <TouchableOpacity
                    style={dynamicStyles.eyeButton}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    activeOpacity={0.6}
                  >
                    <MaterialIcons
                      name={showCurrentPassword ? 'visibility' : 'visibility-off'}
                      size={20}
                      color={colors.icon}
                    />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={dynamicStyles.forgotPasswordButton}
                onPress={() => router.push('/forgot-password')}
              >
                <Text style={dynamicStyles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <View style={dynamicStyles.inputGroup}>
              <Text style={dynamicStyles.label}>New Password</Text>
              <View style={dynamicStyles.passwordContainer}>
                <TextInput
                  style={dynamicStyles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  placeholder="••••••••"
                  placeholderTextColor={isDark ? '#555' : '#aaa'}
                />
                {newPassword.length > 0 && (
                  <TouchableOpacity
                    style={dynamicStyles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    activeOpacity={0.6}
                  >
                    <MaterialIcons
                      name={showNewPassword ? 'visibility' : 'visibility-off'}
                      size={20}
                      color={colors.icon}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={dynamicStyles.inputGroup}>
              <Text style={dynamicStyles.label}>Confirm New Password</Text>
              <View style={dynamicStyles.passwordContainer}>
                <TextInput
                  style={dynamicStyles.passwordInput}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  secureTextEntry={!showConfirmNewPassword}
                  placeholder="••••••••"
                  placeholderTextColor={isDark ? '#555' : '#aaa'}
                />
                {confirmNewPassword.length > 0 && (
                  <TouchableOpacity
                    style={dynamicStyles.eyeButton}
                    onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    activeOpacity={0.6}
                  >
                    <MaterialIcons
                      name={showConfirmNewPassword ? 'visibility' : 'visibility-off'}
                      size={20}
                      color={colors.icon}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={dynamicStyles.editActions}>
              <TouchableOpacity
                style={[dynamicStyles.editActionButton, { backgroundColor: isDark ? '#3a3d40' : '#e9ecef' }]}
                onPress={() => {
                  setIsChangingPassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setPasswordError('');
                }}
                disabled={isUpdatingPassword}
              >
                <Text style={[dynamicStyles.editActionText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[dynamicStyles.editActionButton, { backgroundColor: colors.tint }]}
                onPress={handleChangePassword}
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[dynamicStyles.editActionText, { color: '#fff' }]}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={dynamicStyles.infoRow}>
            <Text style={dynamicStyles.infoLabel}>Password</Text>
            <Text style={dynamicStyles.infoValue}>••••••••</Text>
          </View>
        )}
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={dynamicStyles.signOutButton}
        onPress={handleSignOut}
        disabled={loggingOut}
        activeOpacity={0.8}
      >
        {loggingOut ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialIcons name="logout" size={20} color="#fff" />
            <Text style={dynamicStyles.signOutText}>Sign Out</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

export default function AccountScreen() {
  const { data: session, isPending } = authClient.useSession();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  if (isPending) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

if (!session || !session.user) {
  return <Redirect href="/sign-up-in" />;
}

  return <AccountDetails session={session} />;

}

function getDynamicStyles(isDark: boolean, colors: typeof Colors.light) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
    },
    accountScrollContent: {
      padding: 24,
      paddingTop: 60,
    },
    header: {
      marginBottom: 32,
      alignItems: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: colors.icon,
    },
    card: {
      backgroundColor: isDark ? '#1e2022' : '#f8f9fa',
      borderRadius: 16,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    toggleContainer: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#2a2d30' : '#e9ecef',
      borderRadius: 10,
      padding: 3,
      marginBottom: 24,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    toggleButtonActive: {
      backgroundColor: colors.tint,
    },
    toggleText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.icon,
    },
    toggleTextActive: {
      color: '#fff',
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.icon,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: isDark ? '#2a2d30' : '#fff',
      borderWidth: 1,
      borderColor: isDark ? '#3a3d40' : '#dee2e6',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#2a2d30' : '#fff',
      borderWidth: 1,
      borderColor: isDark ? '#3a3d40' : '#dee2e6',
      borderRadius: 10,
    },
    passwordInput: {
      flex: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
    },
    eyeButton: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rememberMeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      marginTop: 4,
    },
    forgotPasswordButton: {
      alignSelf: 'flex-end',
      marginTop: 8,
    },
    forgotPasswordText: {
      color: colors.tint,
      fontSize: 13,
      fontWeight: '600',
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: isDark ? '#555' : '#ced4da',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      backgroundColor: isDark ? '#2a2d30' : '#fff',
    },
    checkboxChecked: {
      backgroundColor: colors.tint,
      borderColor: colors.tint,
    },
    checkmark: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 16,
    },
    rememberMeText: {
      fontSize: 14,
      color: colors.text,
    },
    termsLink: {
      color: colors.tint,
      textDecorationLine: 'underline',
    },
    requiredStar: {
      color: '#dc2626',
      fontWeight: '700',
    },
    errorContainer: {
      backgroundColor: isDark ? '#3d1f1f' : '#fee2e2',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    errorText: {
      color: isDark ? '#fca5a5' : '#dc2626',
      fontSize: 13,
      textAlign: 'center',
    },
    submitButton: {
      backgroundColor: colors.tint,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },

    // Account Details
    avatarContainer: {
      alignItems: 'center',
      marginBottom: 32,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.tint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    avatarText: {
      color: '#fff',
      fontSize: 28,
      fontWeight: '700',
    },
    userName: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 14,
      color: colors.icon,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.icon,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 16,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    infoLabel: {
      fontSize: 15,
      color: colors.icon,
    },
    infoValue: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: isDark ? '#3a3d40' : '#dee2e6',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    editLink: {
      color: colors.tint,
      fontSize: 14,
      fontWeight: '600',
    },
    editActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 20,
      gap: 12,
    },
    editActionButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      minWidth: 80,
      alignItems: 'center',
    },
    editActionText: {
      fontWeight: '600',
      fontSize: 14,
    },
    signOutButton: {
      backgroundColor: '#dc2626',
      borderRadius: 10,
      paddingVertical: 14,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
      gap: 8,
    },
    signOutText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
