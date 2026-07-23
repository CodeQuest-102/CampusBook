import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TextField, Button, TopBar, KeyboardAvoider } from '../components';
import { colors, fontWeight, radius, spacing, typography } from '../theme';
import { useApp } from '../navigation/AppContext';
import { ApiError } from '../api';
import {
  CAMPUS_ID_LENGTH,
  PASSWORD_MIN_LENGTH,
  campusIdLabel,
  digitsOnly,
  validateCampusId,
  validateFullName,
  validateKnustEmail,
  validatePassword,
  validatePasswordMatch,
} from '../validation';
import type { Role } from '../data/placeholder';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

// Admin accounts are provisioned by the institution, not self-registered.
const ROLES: { key: Role; label: string }[] = [
  { key: 'student', label: 'Student Leader' },
  { key: 'staff', label: 'Lecturer' },
];

export default function SignUpScreen({ navigation }: Props) {
  const { signUp } = useApp();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [staffOrStudentId, setStaffOrStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  // `error` is for API failures only; every field problem shows on its own field.
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const idLength = CAMPUS_ID_LENGTH[role];

  // Student and staff IDs differ in length, so an ID typed under one role can
  // be too long for the other. Re-truncate rather than leave it over the cap.
  const onRoleChange = (next: Role) => {
    setRole(next);
    setStaffOrStudentId((id) => id.slice(0, CAMPUS_ID_LENGTH[next]));
    setIdError(null);
  };

  const onSubmit = async () => {
    // Collect every field problem in one pass so the user fixes them together
    // rather than discovering them one submit at a time. Full name goes through
    // the same path as the rest — it used to bail out early with a generic
    // "fill in all required fields", which named no field to go and fix.
    const problems = {
      name: validateFullName(fullName),
      email: validateKnustEmail(email),
      id: validateCampusId(role, staffOrStudentId),
      password: validatePassword(password),
      confirm: validatePasswordMatch(password, confirm),
    };
    setNameError(problems.name);
    setEmailError(problems.email);
    setIdError(problems.id);
    setPasswordError(problems.password);
    setConfirmError(problems.confirm);
    if (Object.values(problems).some(Boolean)) {
      setError(null);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        role,
        staffOrStudentId: staffOrStudentId.trim(),
        department: department.trim() || undefined,
        password,
      });
      // Success → navigator swaps to the authenticated stack automatically.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoider>
      <TopBar variant="title" title="Create Account" onBack={() => navigation.goBack()} />
      <Screen scroll>
        <Text style={styles.subtitle}>Join CampusBook to get started</Text>

        <TextField
          label="Full Name"
          icon="person-outline"
          placeholder="Abubakar Sadiq"
          error={nameError}
          value={fullName}
          onChangeText={(t) => {
            setFullName(t);
            if (nameError) setNameError(null);
          }}
        />
        <TextField
          label="Email Address"
          icon="mail-outline"
          placeholder="you@st.knust.edu.gh"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          helper="Use your KNUST address"
          error={emailError}
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (emailError) setEmailError(null);
          }}
        />

        <Text style={styles.groupLabel}>I am a</Text>
        <View style={styles.roleRow}>
          {ROLES.map((r) => {
            const active = role === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                style={[styles.roleChip, active && styles.roleChipActive]}
                onPress={() => onRoleChange(r.key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.roleText, active && styles.roleTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextField
          label={campusIdLabel(role)}
          icon="id-card-outline"
          placeholder={role === 'staff' ? 'e.g. 200912345' : 'e.g. 20551234'}
          keyboardType="number-pad"
          maxLength={idLength}
          helper={`Exactly ${idLength} digits`}
          error={idError}
          value={staffOrStudentId}
          onChangeText={(t) => {
            setStaffOrStudentId(digitsOnly(t));
            if (idError) setIdError(null);
          }}
        />
        <TextField
          label="Department"
          icon="business-outline"
          placeholder="Computer Science"
          value={department}
          onChangeText={setDepartment}
        />
        <TextField
          label="Password"
          icon="lock-closed-outline"
          placeholder="••••••••"
          secure
          helper={`At least ${PASSWORD_MIN_LENGTH} characters`}
          error={passwordError}
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            if (passwordError) setPasswordError(null);
          }}
        />
        <TextField
          label="Confirm Password"
          icon="lock-closed-outline"
          placeholder="••••••••"
          secure
          error={confirmError}
          value={confirm}
          onChangeText={(t) => {
            setConfirm(t);
            if (confirmError) setConfirmError(null);
          }}
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

        {error && <Text style={styles.error}>{error}</Text>}

        <Button
          title="Sign Up"
          disabled={!agreed}
          loading={loading}
          onPress={onSubmit}
          style={{ marginTop: spacing.md }}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} hitSlop={8}>
            <Text style={styles.footerLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    </KeyboardAvoider>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...typography.bodyMuted, marginTop: spacing.sm, marginBottom: spacing.xl },
  groupLabel: {
    ...typography.caption,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  roleRow: { flexDirection: 'row', marginBottom: spacing.lg },
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
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.md,
    fontWeight: fontWeight.medium,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.textSecondary },
  footerLink: { color: colors.primary, fontWeight: fontWeight.semibold },
});
