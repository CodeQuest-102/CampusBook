import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Screen,
  TextField,
  Button,
  TopBar,
  KeyboardAvoider,
  SuccessOverlay,
} from '../../components';
import { colors, fontWeight, radius, spacing, typography } from '../../theme';
import { usersApi, roleToBackend, ApiError } from '../../api';
import {
  CAMPUS_ID_LENGTH,
  PASSWORD_MIN_LENGTH,
  campusIdLabel,
  digitsOnly,
  validateCampusId,
  validateEmail,
  validateFullName,
  validatePassword,
} from '../../validation';
import type { Role } from '../../data/types';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddUser'>;

/**
 * Unlike the sign-up screen this offers Admin — an admin provisioning a
 * colleague is exactly the case public registration refuses, and until this
 * existed the only route to a second admin account was the database seeder.
 */
const ROLES: { key: Role; label: string }[] = [
  { key: 'student', label: 'Student Leader' },
  { key: 'staff', label: 'Lecturer' },
  { key: 'admin', label: 'Admin' },
];

export default function AddUserScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [staffOrStudentId, setStaffOrStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    name?: string | null;
    email?: string | null;
    id?: string | null;
    password?: string | null;
  }>({});

  const idLength = CAMPUS_ID_LENGTH[role];
  // Admin numbers are free-form (the seeded one is "ADMIN001"); student and
  // staff IDs are fixed-length digits, so those get constrained as you type.
  const numericId = idLength > 0;

  const onRoleChange = (next: Role) => {
    setRole(next);
    const cap = CAMPUS_ID_LENGTH[next];
    if (cap > 0) setStaffOrStudentId((id) => digitsOnly(id).slice(0, cap));
    setErrors((e) => ({ ...e, id: null }));
  };

  const submit = async () => {
    const problems = {
      name: validateFullName(fullName),
      email: validateEmail(email),
      id: validateCampusId(role, staffOrStudentId),
      password: validatePassword(password),
    };
    setErrors(problems);
    if (Object.values(problems).some(Boolean)) {
      setError(null);
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await usersApi.createUser({
        fullName: fullName.trim(),
        email: email.trim(),
        staffOrStudentId: staffOrStudentId.trim(),
        password,
        role: roleToBackend(role),
        department: department.trim() || undefined,
      });
      setCreated(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create this user. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoider>
      <TopBar variant="title" title="Add User" onBack={() => navigation.goBack()} />
      <Screen scroll>
        <Text style={styles.subtitle}>
          The account is created at your institution. Share the password with them so they can sign
          in and change it.
        </Text>

        <TextField
          label="Full Name"
          icon="person-outline"
          placeholder="Ama Serwaa Oyei"
          error={errors.name}
          value={fullName}
          onChangeText={(t) => {
            setFullName(t);
            if (errors.name) setErrors((e) => ({ ...e, name: null }));
          }}
        />
        <TextField
          label="Email Address"
          icon="mail-outline"
          placeholder="name@yourinstitution.edu"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          helper="Must be at your institution's domain"
          error={errors.email}
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (errors.email) setErrors((e) => ({ ...e, email: null }));
          }}
        />

        <Text style={styles.groupLabel}>Role</Text>
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
          placeholder={role === 'admin' ? 'e.g. ADMIN001' : 'Their institution-issued ID'}
          keyboardType={numericId ? 'number-pad' : 'default'}
          autoCapitalize={numericId ? 'none' : 'characters'}
          maxLength={numericId ? idLength : undefined}
          helper={numericId ? `Exactly ${idLength} digits` : 'Any institution-issued ID'}
          error={errors.id}
          value={staffOrStudentId}
          onChangeText={(t) => {
            setStaffOrStudentId(numericId ? digitsOnly(t) : t);
            if (errors.id) setErrors((e) => ({ ...e, id: null }));
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
          label="Temporary Password"
          icon="lock-closed-outline"
          placeholder="••••••••"
          secure
          helper={`At least ${PASSWORD_MIN_LENGTH} characters`}
          error={errors.password}
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            if (errors.password) setErrors((e) => ({ ...e, password: null }));
          }}
        />

        {error && <Text style={styles.error}>{error}</Text>}
      </Screen>

      <View style={styles.footer}>
        <Button title="Create User" icon="person-add-outline" loading={saving} onPress={submit} />
      </View>

      <SuccessOverlay
        visible={created}
        title="User Created"
        subtitle={`${fullName.trim()} can now sign in.`}
        onDone={() => {
          setCreated(false);
          navigation.goBack();
        }}
      />
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
  roleText: { color: colors.textSecondary, fontWeight: fontWeight.semibold, fontSize: 12 },
  roleTextActive: { color: colors.white },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: spacing.md,
    fontWeight: fontWeight.medium,
  },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
  },
});
