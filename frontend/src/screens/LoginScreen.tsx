import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TextField, Button } from '../components';
import { colors, fontWeight, radius, spacing, typography } from '../theme';
import { useApp } from '../navigation/AppContext';
import type { Role } from '../data/placeholder';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const ROLES: { key: Role; label: string }[] = [
  { key: 'student', label: 'Student' },
  { key: 'staff', label: 'Staff' },
  { key: 'admin', label: 'Admin' },
];

export default function LoginScreen({ navigation }: Props) {
  const { role, setRole } = useApp();

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Login to your account</Text>
      </View>

      {/* Demo-only role selector so every role's dashboard is reachable. */}
      <View style={styles.roleRow}>
        {ROLES.map((r) => {
          const active = role === r.key;
          return (
            <TouchableOpacity
              key={r.key}
              style={[styles.roleChip, active && styles.roleChipActive]}
              onPress={() => setRole(r.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.roleText, active && styles.roleTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextField
        label="Email Address"
        icon="mail-outline"
        placeholder="you@st.knust.edu.gh"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextField label="Password" icon="lock-closed-outline" placeholder="••••••••" secure />

      <TouchableOpacity
        style={styles.forgot}
        hitSlop={8}
        onPress={() => navigation.navigate('ForgotPassword')}
      >
        <Text style={styles.forgotText}>Forgot password?</Text>
      </TouchableOpacity>

      <Button title="Login" onPress={() => navigation.replace('Main')} />

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.divider} />
      </View>

      <SocialButton
        icon="logo-google"
        label="Continue with Google"
        onPress={() => navigation.replace('Main')}
      />
      <SocialButton
        icon="logo-microsoft"
        label="Continue with Microsoft"
        onPress={() => navigation.replace('Main')}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignUp')} hitSlop={8}>
          <Text style={styles.footerLink}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

function SocialButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.social} activeOpacity={0.85} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.text} />
      <Text style={styles.socialText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.huge, marginBottom: spacing.xl },
  title: { ...typography.h1 },
  subtitle: { ...typography.bodyMuted, marginTop: spacing.xs },
  roleRow: { flexDirection: 'row', marginBottom: spacing.xl },
  roleChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  roleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleText: { color: colors.textSecondary, fontWeight: fontWeight.semibold, fontSize: 13 },
  roleTextActive: { color: colors.white },
  forgot: { alignSelf: 'flex-end', marginBottom: spacing.lg },
  forgotText: { color: colors.primary, fontWeight: fontWeight.medium, fontSize: 13 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.xl },
  divider: { flex: 1, height: 1, backgroundColor: colors.divider },
  dividerText: { marginHorizontal: spacing.md, color: colors.textTertiary, fontSize: 13 },
  social: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  socialText: { marginLeft: spacing.md, fontWeight: fontWeight.medium, color: colors.text },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { color: colors.textSecondary },
  footerLink: { color: colors.primary, fontWeight: fontWeight.semibold },
});
