import { useState } from 'react';
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
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { authClient } from '@/lib/auth-client';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const { data: session, isPending } = authClient.useSession();
  const mail = session?.user?.email;

  const [email, setEmail] = useState(mail || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const res = await authClient.requestPasswordReset({
        email,
        redirectTo: Linking.createURL('/reset-password'),
      });
      
      if (res.error) {
        setError(res.error.message ?? 'Failed to send reset link');
      } else {
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
        <MaterialIcons name="mark-email-unread" size={80} color={colors.tint} style={{ marginBottom: 24 }} />
        <Text style={dynamicStyles.title}>Check your email</Text>
        <Text style={[dynamicStyles.subtitle, { textAlign: 'center', marginTop: 8, marginBottom: 32 }]}>
          We&apos;ve sent a password reset link to {email}.
        </Text>
        <TouchableOpacity
          style={[dynamicStyles.submitButton, { width: '100%' }]}
          onPress={() => router.back()}
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
          <Text style={dynamicStyles.title}>Reset Password</Text>
          <Text style={dynamicStyles.subtitle}>
            Enter your email to receive a password reset link
          </Text>
        </View>

        <View style={dynamicStyles.card}>
          {error ? (
            <View style={dynamicStyles.errorContainer}>
              <Text style={dynamicStyles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={dynamicStyles.inputGroup}>
            <Text style={dynamicStyles.label}>Email</Text>
            <TextInput
              style={dynamicStyles.input}
              placeholder="you@example.com"
              placeholderTextColor={isDark ? '#555' : '#aaa'}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[dynamicStyles.submitButton, loading && dynamicStyles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={dynamicStyles.submitText}>Send Reset Link</Text>
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
