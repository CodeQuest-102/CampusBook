import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar, TextField, Button } from '../../components';
import { colors, fontWeight, radius, spacing, typography } from '../../theme';
import { authApi, ApiError } from '../../api';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [done, setDone] = useState(false);
  const [emailOrId, setEmailOrId] = useState('');
  const [staffOrStudentId, setStaffOrStudentId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!emailOrId.trim() || !staffOrStudentId.trim() || !newPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword({
        emailOrId: emailOrId.trim(),
        staffOrStudentId: staffOrStudentId.trim(),
        newPassword,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopBar variant="title" title="Forgot Password" onBack={() => navigation.goBack()} />
      <Screen scroll>
        <View style={styles.iconWrap}>
          <Ionicons
            name={done ? 'checkmark-circle-outline' : 'lock-closed-outline'}
            size={44}
            color={colors.primary}
          />
        </View>

        {done ? (
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
        ) : (
          <>
            <Text style={styles.title}>Reset your password</Text>
            <Text style={styles.body}>
              Confirm your identity with your account email and ID, then set a new password.
            </Text>
            <TextField
              label="Email or ID"
              icon="mail-outline"
              placeholder="you@st.knust.edu.gh"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={emailOrId}
              onChangeText={setEmailOrId}
              containerStyle={{ marginTop: spacing.lg }}
            />
            <TextField
              label="Staff / Student ID"
              icon="id-card-outline"
              placeholder="e.g. STU001"
              autoCapitalize="characters"
              value={staffOrStudentId}
              onChangeText={setStaffOrStudentId}
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

            <Button title="Reset Password" onPress={submit} loading={loading} />
          </>
        )}
      </Screen>
    </>
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
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.md,
    fontWeight: fontWeight.medium,
  },
});
