import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TextField, Button, TopBar } from '../components';
import { colors, fontWeight, radius, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

export default function SignUpScreen({ navigation }: Props) {
  const [agreed, setAgreed] = useState(false);

  return (
    <>
      <TopBar variant="title" title="Create Account" onBack={() => navigation.goBack()} />
      <Screen scroll>
        <Text style={styles.subtitle}>Join CampusBook to get started</Text>

        <TextField label="Full Name" icon="person-outline" placeholder="Abubakar Sadiq" />
        <TextField
          label="Email Address"
          icon="mail-outline"
          placeholder="you@st.knust.edu.gh"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          label="Phone Number"
          icon="call-outline"
          placeholder="+233 ..."
          keyboardType="phone-pad"
        />
        <TextField label="Password" icon="lock-closed-outline" placeholder="••••••••" secure />
        <TextField
          label="Confirm Password"
          icon="lock-closed-outline"
          placeholder="••••••••"
          secure
        />

        <TouchableOpacity
          style={styles.terms}
          onPress={() => setAgreed((a) => !a)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Ionicons name="checkmark" size={14} color={colors.white} />}
          </View>
          <Text style={styles.termsText}>
            I agree to the <Text style={styles.link}>Terms & Conditions</Text> and{' '}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>
        </TouchableOpacity>

        <Button
          title="Sign Up"
          disabled={!agreed}
          onPress={() => navigation.replace('Main')}
          style={{ marginTop: spacing.md }}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} hitSlop={8}>
            <Text style={styles.footerLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...typography.bodyMuted, marginTop: spacing.sm, marginBottom: spacing.xl },
  terms: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  termsText: { flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  link: { color: colors.primary, fontWeight: fontWeight.medium },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.textSecondary },
  footerLink: { color: colors.primary, fontWeight: fontWeight.semibold },
});
