import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Stack, useGlobalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import * as Linking from 'expo-linking';
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
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type AuthMode = 'signin' | 'signup';

export default function AuthScreen() {
    const { data: session, isPending } = authClient.useSession();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const isDark = colorScheme === 'dark';
    const router = useRouter();

    const [mode, setMode] = useState<AuthMode>('signin');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isVerificationSent, setIsVerificationSent] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const params = useGlobalSearchParams();

    useEffect(() => {
        if (params.verified === 'true') {
            setSuccessMessage('Email verified successfully! Please sign in.');
            setMode('signin');
            setIsVerificationSent(false);
            setPassword('');
            setConfirmPassword('');

            const timer = setTimeout(() => {
                setSuccessMessage('');
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [params]);


    useEffect(() => {
        if (!isPending && session) {
            router.replace("/");
        }
    }, [session, isPending]);

    const handleSubmit = async () => {
        console.log("Submitting form with mode:", mode);
        setError('');
        setSuccessMessage('');
        if (mode === 'signup') {
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
            if (!agreeTerms) {
                setError('You must agree to the Terms and Conditions');
                return;
            }
        }
        setLoading(true);
        try {
            if (mode === 'signup') {
                console.log("Signing up with email:", email);
                const res = await authClient.signUp.email({
                    name,
                    email,
                    password,
                    callbackURL: Linking.createURL('/account', { queryParams: { verified: 'true' }, scheme: "dhpulse" }),
                });
                console.log(Linking.createURL('/account', { queryParams: { verified: 'true' }, scheme: "dhpulse" }))
                console.log("Sign up response:", res);

                if (res.error) {
                    setError(res.error.message ?? res.error.statusText ?? 'Sign up failed');
                } else {
                    if (res.data.user.emailVerified !== true) {
                        await authClient.sendVerificationEmail({ email: email, callbackURL: Linking.createURL('/account', { queryParams: { verified: 'true' } }) });
                    }
                    setIsVerificationSent(true);
                }
            } else {
                const res = await authClient.signIn.email({
                    email,
                    password,
                    rememberMe,
                });
                console.log(res)
                if (res.error) {
                    setError(res.error.message ?? 'Sign in failed');
                } else {
                    router.replace("/")
                }
            }
        } catch (e: any) {
            setError(e?.message ?? 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const dynamicStyles = getDynamicStyles(isDark, colors);

    if (isVerificationSent) {
        return (
            <View style={[dynamicStyles.container, { justifyContent: 'center', padding: 24, alignItems: 'center' }]}>
                <MaterialIcons name="mark-email-unread" size={80} color={colors.tint} style={{ marginBottom: 24 }} />
                <Text style={dynamicStyles.title}>Check your email</Text>
                <Text style={[dynamicStyles.subtitle, { textAlign: 'center', marginTop: 8, marginBottom: 32 }]}>
                    We&apos;ve sent a verification link to {email}. Please check your inbox and verify your account to continue.
                </Text>
                <TouchableOpacity
                    style={[dynamicStyles.submitButton, { width: '100%' }]}
                    onPress={() => {
                        setIsVerificationSent(false);
                        setMode('signin');
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={dynamicStyles.submitText}>Back to Sign In</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <>
            <Stack.Screen options={{
                title: mode === "signin" ? "Sign In" : "Create Account"
            }} />
            <KeyboardAvoidingView
                style={dynamicStyles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={dynamicStyles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={dynamicStyles.header}>
                        <Text style={dynamicStyles.title}>
                            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
                        </Text>
                        <Text style={dynamicStyles.subtitle}>
                            {mode === 'signin'
                                ? 'Sign in to access your account'
                                : 'Sign up to get started'}
                        </Text>
                    </View>

                    <View style={dynamicStyles.card}>
                        {/* Mode Toggle */}
                        <View style={dynamicStyles.toggleContainer}>
                            <TouchableOpacity
                                style={[
                                    dynamicStyles.toggleButton,
                                    mode === 'signin' && dynamicStyles.toggleButtonActive,
                                ]}
                                onPress={() => { setMode('signin'); setError(''); setSuccessMessage(''); }}
                            >
                                <Text
                                    style={[
                                        dynamicStyles.toggleText,
                                        mode === 'signin' && dynamicStyles.toggleTextActive,
                                    ]}
                                >
                                    Sign In
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    dynamicStyles.toggleButton,
                                    mode === 'signup' && dynamicStyles.toggleButtonActive,
                                ]}
                                onPress={() => { setMode('signup'); setError(''); setSuccessMessage(''); }}
                            >
                                <Text
                                    style={[
                                        dynamicStyles.toggleText,
                                        mode === 'signup' && dynamicStyles.toggleTextActive,
                                    ]}
                                >
                                    Sign Up
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Success Message */}
                        {successMessage ? (
                            <View style={[dynamicStyles.errorContainer, { backgroundColor: isDark ? '#1a3a2a' : '#d1fae5' }]}>
                                <Text style={[dynamicStyles.errorText, { color: isDark ? '#6ee7b7' : '#047857' }]}>
                                    {successMessage}
                                </Text>
                            </View>
                        ) : null}

                        {/* Name field (sign up only) */}
                        {mode === 'signup' && (
                            <View style={dynamicStyles.inputGroup}>
                                <Text style={dynamicStyles.label}>Name</Text>
                                <TextInput
                                    style={dynamicStyles.input}
                                    placeholder="Your name"
                                    placeholderTextColor={isDark ? '#555' : '#aaa'}
                                    value={name}
                                    onChangeText={setName}
                                    autoCapitalize="words"
                                />
                            </View>
                        )}

                        {/* Email */}
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

                        {/* Password */}
                        <View style={dynamicStyles.inputGroup}>
                            <Text style={dynamicStyles.label}>Password</Text>
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

                            {/* Forgot Password Link */}
                            {mode === 'signin' && (
                                <TouchableOpacity
                                    style={dynamicStyles.forgotPasswordButton}
                                    onPress={() => router.push('/forgot-password')}
                                >
                                    <Text style={dynamicStyles.forgotPasswordText}>Forgot Password?</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Confirm Password (sign up only) */}
                        {mode === 'signup' && (
                            <View style={dynamicStyles.inputGroup}>
                                <Text style={dynamicStyles.label}>Confirm Password</Text>
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
                        )}

                        {/* Agree to Terms (sign up only) */}
                        {mode === 'signup' && (
                            <TouchableOpacity
                                style={dynamicStyles.rememberMeRow}
                                onPress={() => setAgreeTerms(!agreeTerms)}
                                activeOpacity={0.7}
                            >
                                <View
                                    style={[
                                        dynamicStyles.checkbox,
                                        agreeTerms && dynamicStyles.checkboxChecked,
                                    ]}
                                >
                                    {agreeTerms && (
                                        <Text style={dynamicStyles.checkmark}>✓</Text>
                                    )}
                                </View>
                                <Text style={dynamicStyles.rememberMeText}>
                                    I agree to the{' '}
                                    <Text style={dynamicStyles.termsLink}>Terms and Conditions</Text>
                                    <Text style={dynamicStyles.requiredStar}>*</Text>
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Remember Me (sign in only) */}
                        {mode === 'signin' && (
                            <TouchableOpacity
                                style={dynamicStyles.rememberMeRow}
                                onPress={() => setRememberMe(!rememberMe)}
                                activeOpacity={0.7}
                            >
                                <View
                                    style={[
                                        dynamicStyles.checkbox,
                                        rememberMe && dynamicStyles.checkboxChecked,
                                    ]}
                                >
                                    {rememberMe && (
                                        <Text style={dynamicStyles.checkmark}>✓</Text>
                                    )}
                                </View>
                                <Text style={dynamicStyles.rememberMeText}>Remember me</Text>
                            </TouchableOpacity>
                        )}

                        {/* Error */}
                        {error ? (
                            <View style={dynamicStyles.errorContainer}>
                                <Text style={dynamicStyles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Submit */}
                        <TouchableOpacity
                            style={[dynamicStyles.submitButton, loading && dynamicStyles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={dynamicStyles.submitText}>
                                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </>
    );
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