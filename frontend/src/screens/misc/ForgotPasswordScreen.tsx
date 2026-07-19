import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar, TextField, Button } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [sent, setSent] = useState(false);

  return (
    <>
      <TopBar variant="title" title="Forgot Password" onBack={() => navigation.goBack()} />
      <Screen scroll>
        <View style={styles.iconWrap}>
          <Ionicons name={sent ? 'mail-open-outline' : 'lock-closed-outline'} size={44} color={colors.primary} />
        </View>

        {sent ? (
          <>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.body}>
              We've sent a password reset link to your email address. Follow the instructions to
              reset your password.
            </Text>
            <Button title="Back to Login" onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing.xl }} />
          </>
        ) : (
          <>
            <Text style={styles.title}>Reset your password</Text>
            <Text style={styles.body}>
              Enter the email linked to your account and we'll send you a reset link.
            </Text>
            <TextField
              label="Email Address"
              icon="mail-outline"
              placeholder="you@st.knust.edu.gh"
              keyboardType="email-address"
              autoCapitalize="none"
              containerStyle={{ marginTop: spacing.lg }}
            />
            <Button title="Send Reset Link" onPress={() => setSent(true)} />
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
  },
});
