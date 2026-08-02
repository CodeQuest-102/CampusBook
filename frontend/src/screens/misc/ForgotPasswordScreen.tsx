import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar, TextField, Button, KeyboardAvoider } from '../../components';
import { colors, fontWeight, radius, spacing, typography } from '../../theme';
import { authApi, ApiError } from '../../api';
import { digitsOnly, validatePassword, validatePasswordMatch } from '../../validation';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

type Step = 'request' | 'verify' | 'done';

/** Seconds before a new code can be requested. */
const RESEND_COOLDOWN = 30;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [step, setStep] = useState<Step>('request');
  const [emailOrId, setEmailOrId] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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

  const requestCode = async () => {
    if (!emailOrId.trim()) {
      setError('Enter your account email or ID.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword({ emailOrId: emailOrId.trim() });
      // The API always succeeds (it never reveals whether the account exists),
      // so we always advance to the code-entry step.
      setStep('verify');
      setCooldown(RESEND_COOLDOWN);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send a code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (cooldown > 0) return;
    setError(null);
    try {
      await authApi.forgotPassword({ emailOrId: emailOrId.trim() });
      setCooldown(RESEND_COOLDOWN);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not resend the code.');
    }
  };

  const submitReset = async () => {
    if (!otp.trim()) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    const matchError = validatePasswordMatch(newPassword, confirm);
    if (matchError) {
      setError(matchError);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword({ emailOrId: emailOrId.trim(), otp: otp.trim(), newPassword });
      setStep('done');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoider>
      <TopBar variant="title" title="Forgot Password" onBack={() => navigation.goBack()} />
      <Screen scroll>
        <View style={styles.iconWrap}>
          <Ionicons
            name={step === 'done' ? 'checkmark-circle-outline' : 'lock-closed-outline'}
            size={44}
            color={colors.primary}
          />
        </View>

        {step === 'request' && (
          <>
            <Text style={styles.title}>Reset your password</Text>
            <Text style={styles.body}>
              Enter your account email or ID and we'll send a reset code to your registered
              email address.
            </Text>
            <TextField
              label="Email or ID"
              icon="mail-outline"
              placeholder="you@yourinstitution.edu"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={emailOrId}
              onChangeText={setEmailOrId}
              containerStyle={{ marginTop: spacing.lg }}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Button title="Send Code" onPress={requestCode} loading={loading} />
          </>
        )}

        {step === 'verify' && (
          <>
            <Text style={styles.title}>Enter your code</Text>
            <Text style={styles.body}>
              We sent a 6-digit code to the email for{' '}
              <Text style={styles.strong}>{emailOrId.trim()}</Text>. Enter it below with your new
              password. The code expires in 10 minutes.
            </Text>
            <TextField
              label="6-digit code"
              icon="keypad-outline"
              placeholder="123456"
              keyboardType="number-pad"
              value={otp}
              onChangeText={(t) => setOtp(digitsOnly(t).slice(0, 6))}
              containerStyle={{ marginTop: spacing.lg }}
            />
            <TextField
              label="New Password"
              icon="lock-closed-outline"
              placeholder="••••••••"
              secure
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextField
              label="Confirm New Password"
              icon="lock-closed-outline"
              placeholder="••••••••"
              secure
              value={confirm}
              onChangeText={setConfirm}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Button title="Reset Password" onPress={submitReset} loading={loading} />

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
          </>
        )}

        {step === 'done' && (
          <>
            <Text style={styles.title}>Password reset</Text>
            <Text style={styles.body}>
              Your password has been updated. You can now log in with your new password.
            </Text>
            <Button
              title="Back to Login"
              onPress={() => navigation.navigate('Login')}
              style={{ marginTop: spacing.xl }}
            />
          </>
        )}
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
