import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar, TextField, Button, KeyboardAvoider } from '../../components';
import { colors, fontWeight, radius, spacing, typography } from '../../theme';
import { useApp } from '../../navigation/AppContext';
import { authApi, ApiError } from '../../api';
import { digitsOnly } from '../../validation';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

/** Seconds before a new code can be requested. */
const RESEND_COOLDOWN = 30;

/**
 * Reached right after sign-up, or from Login when a correct password hits an
 * unverified account (see LoginScreen's 403 handling) — the code is always
 * already sent by the time this screen opens, so unlike ForgotPasswordScreen
 * there's no separate "request a code" step first.
 */
export default function VerifyEmailScreen({ navigation, route }: Props) {
  const { completeVerification } = useApp();
  const { emailOrId } = route.params;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Tick the resend cooldown down to zero.
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (cooldown <= 0) return;
    timer.current = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [cooldown]);

  const resendCode = async () => {
    if (cooldown > 0) return;
    setError(null);
    try {
      await authApi.resendVerification({ emailOrId });
      setCooldown(RESEND_COOLDOWN);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not resend the code.');
    }
  };

  const submitVerify = async () => {
    if (!otp.trim()) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const auth = await authApi.verifyEmail({ emailOrId, otp: otp.trim() });
      await completeVerification(auth);
      // On success the navigator swaps to the authenticated stack automatically.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not verify your email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoider>
      <TopBar variant="title" title="Verify your email" onBack={() => navigation.navigate('Login')} />
      <Screen scroll>
        <View style={styles.iconWrap}>
          <Ionicons name="mail-open-outline" size={44} color={colors.primary} />
        </View>

        <Text style={styles.title}>Enter your code</Text>
        <Text style={styles.body}>
          We sent a 6-digit code to <Text style={styles.strong}>{emailOrId}</Text>. Enter it below
          to finish setting up your account. The code expires in 10 minutes.
        </Text>

        <TextField
          label="6-digit code"
          icon="keypad-outline"
          placeholder="123456"
          keyboardType="number-pad"
          value={otp}
          onChangeText={(t) => {
            setOtp(digitsOnly(t).slice(0, 6));
            if (error) setError(null);
          }}
          containerStyle={{ marginTop: spacing.lg }}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Button title="Verify" onPress={submitVerify} loading={loading} />

        <TouchableOpacity
          onPress={resendCode}
          disabled={cooldown > 0}
          style={styles.resend}
          activeOpacity={0.7}
        >
          <Text style={[styles.resendText, cooldown > 0 && styles.resendDisabled]}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </Text>
        </TouchableOpacity>
      </Screen>
    </KeyboardAvoider>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  title: { ...typography.h2, textAlign: 'center' },
  body: {
    ...typography.bodyMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  strong: { fontWeight: fontWeight.semibold, color: colors.text },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.md,
    fontWeight: fontWeight.medium,
  },
  resend: { alignSelf: 'center', marginTop: spacing.lg, padding: spacing.sm },
  resendText: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: 14 },
  resendDisabled: { color: colors.textSecondary },
});
