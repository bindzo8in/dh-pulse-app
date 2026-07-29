import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { authClient } from '@/lib/auth-client';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useGlobalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const token = params.token as string | undefined;

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token.');
    } else {
      setError('');
    }
  }, [token]);

  const handleSubmit = async () => {
    setError('');
    
    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }
    if (!password) {
      setError('Please enter a new password');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      
      if (res.error) {
        setError(res.error.message ?? 'Failed to reset password');
      } else {
        try {
          // Clear any lingering local session tokens so they have to sign in
          await authClient.signOut();
        } catch (e) {}
        setSuccess(true);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const dynamicStyles = getDynamicStyles(isDark, colors);

  if (success) {
    return (
      <View style={[dynamicStyles.container, { justifyContent: 'center', padding: 24, alignItems: 'center' }]}>
        <MaterialIcons name="check-circle" size={80} color={colors.tint} style={{ marginBottom: 24 }} />
        <Text style={dynamicStyles.title}>Password Reset</Text>
        <Text style={[dynamicStyles.subtitle, { textAlign: 'center', marginTop: 8, marginBottom: 32 }]}>
          Your password has been successfully reset! You can now sign in with your new password.
        </Text>
        <TouchableOpacity
          style={[dynamicStyles.submitButton, { width: '100%' }]}
          onPress={() => router.replace('/(tabs)/account')}
          activeOpacity={0.8}
        >
          <Text style={dynamicStyles.submitText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={dynamicStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={dynamicStyles.content}>
        <TouchableOpacity style={dynamicStyles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.icon} />
        </TouchableOpacity>

        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.title}>New Password</Text>
          <Text style={dynamicStyles.subtitle}>
            Create a new password for your account
          </Text>
        </View>

        <View style={dynamicStyles.card}>
          {error ? (
            <View style={dynamicStyles.errorContainer}>
              <Text style={dynamicStyles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Password */}
          <View style={dynamicStyles.inputGroup}>
            <Text style={dynamicStyles.label}>New Password</Text>
            <View style={dynamicStyles.passwordContainer}>
              <TextInput
                style={dynamicStyles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={isDark ? '#555' : '#aaa'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              {password.length > 0 && (
                <TouchableOpacity
                  style={dynamicStyles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.6}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={colors.icon}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Confirm Password */}
          <View style={dynamicStyles.inputGroup}>
            <Text style={dynamicStyles.label}>Confirm New Password</Text>
            <View style={dynamicStyles.passwordContainer}>
              <TextInput
                style={dynamicStyles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={isDark ? '#555' : '#aaa'}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              {confirmPassword.length > 0 && (
                <TouchableOpacity
                  style={dynamicStyles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.6}
                >
                  <MaterialIcons
                    name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={colors.icon}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[dynamicStyles.submitButton, loading && dynamicStyles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading || !token}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={dynamicStyles.submitText}>Reset Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function getDynamicStyles(isDark: boolean, colors: typeof Colors.light) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: 24,
      paddingTop: 60,
    },
    backButton: {
      marginBottom: 24,
      width: 40,
      height: 40,
      justifyContent: 'center',
    },
    header: {
      marginBottom: 32,
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
      lineHeight: 22,
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
    inputGroup: {
      marginBottom: 24,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.icon,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
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
    errorContainer: {
      backgroundColor: isDark ? '#3a1a1a' : '#fee2e2',
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    errorText: {
      color: isDark ? '#fca5a5' : '#dc2626',
      fontSize: 14,
      textAlign: 'center',
    },
    submitButton: {
      backgroundColor: colors.tint,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      shadowColor: colors.tint,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
    submitText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
