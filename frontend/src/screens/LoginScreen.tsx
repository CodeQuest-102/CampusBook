import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TextField, Button, KeyboardAvoider } from '../components';
import { colors, fontWeight, spacing, typography } from '../theme';
import { useApp } from '../navigation/AppContext';
import { ApiError } from '../api';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useApp();

  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogin = async () => {
    if (!emailOrId.trim() || !password) {
      setError('Enter your email/ID and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(emailOrId.trim(), password);
      // On success the navigator swaps to the authenticated stack automatically.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoider>
      <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Login to your account</Text>
      </View>

      <TextField
        label="Email or ID"
        icon="mail-outline"
        placeholder="you@yourinstitution.edu"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={emailOrId}
        onChangeText={setEmailOrId}
      />
      <TextField
        label="Password"
        icon="lock-closed-outline"
        placeholder="••••••••"
        secure
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={onLogin}
      />

      <TouchableOpacity
        style={styles.forgot}
        hitSlop={8}
        onPress={() => navigation.navigate('ForgotPassword')}
      >
        <Text style={styles.forgotText}>Forgot password?</Text>
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      <Button title="Login" onPress={onLogin} loading={loading} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignUp')} hitSlop={8}>
          <Text style={styles.footerLink}>Sign up</Text>
        </TouchableOpacity>
      </View>
      </Screen>
    </KeyboardAvoider>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.huge, marginBottom: spacing.xl },
  title: { ...typography.h1 },
  subtitle: { ...typography.bodyMuted, marginTop: spacing.xs },
  forgot: { alignSelf: 'flex-end', marginBottom: spacing.lg },
  forgotText: { color: colors.primary, fontWeight: fontWeight.medium, fontSize: 13 },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.md,
    fontWeight: fontWeight.medium,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { color: colors.textSecondary },
  footerLink: { color: colors.primary, fontWeight: fontWeight.semibold },
});
