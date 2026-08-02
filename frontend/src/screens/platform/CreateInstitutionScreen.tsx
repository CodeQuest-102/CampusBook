import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Screen,
  TextField,
  Button,
  TopBar,
  KeyboardAvoider,
  SuccessOverlay,
} from '../../components';
import { colors, fontWeight, spacing, typography } from '../../theme';
import { platformApi, ApiError } from '../../api';
import {
  PASSWORD_MIN_LENGTH,
  validateEmail,
  validateFullName,
  validatePassword,
} from '../../validation';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateInstitution'>;

function validateInstitutionName(value: string): string | null {
  return value.trim() ? null : 'Institution name is required.';
}

function validateDomain(value: string): string | null {
  const domain = value.trim();
  if (!domain) return 'Email domain is required.';
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(domain)) {
    return 'Enter a bare domain, e.g. ug.edu.gh (no @ or https://).';
  }
  return null;
}

function validateStaffId(value: string): string | null {
  return value.trim() ? null : 'Staff ID is required.';
}

export default function CreateInstitutionScreen({ navigation }: Props) {
  const [institutionName, setInstitutionName] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminStaffOrStudentId, setAdminStaffOrStudentId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminDepartment, setAdminDepartment] = useState('');

  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    institutionName?: string | null;
    emailDomain?: string | null;
    adminFullName?: string | null;
    adminEmail?: string | null;
    adminStaffOrStudentId?: string | null;
    adminPassword?: string | null;
  }>({});

  const submit = async () => {
    const problems = {
      institutionName: validateInstitutionName(institutionName),
      emailDomain: validateDomain(emailDomain),
      adminFullName: validateFullName(adminFullName),
      adminEmail: validateEmail(adminEmail),
      adminStaffOrStudentId: validateStaffId(adminStaffOrStudentId),
      adminPassword: validatePassword(adminPassword),
    };
    setErrors(problems);
    if (Object.values(problems).some(Boolean)) {
      setError(null);
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await platformApi.createInstitution({
        institutionName: institutionName.trim(),
        emailDomain: emailDomain.trim().toLowerCase(),
        tier: 'FREE',
        adminFullName: adminFullName.trim(),
        adminEmail: adminEmail.trim(),
        adminStaffOrStudentId: adminStaffOrStudentId.trim(),
        adminPassword,
        adminDepartment: adminDepartment.trim() || undefined,
      });
      setCreated(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create this institution. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoider>
      <TopBar variant="title" title="Add Institution" onBack={() => navigation.goBack()} />
      <Screen scroll>
        <Text style={styles.subtitle}>
          Creates the institution and its first admin account together. Share the password with
          them so they can sign in and change it.
        </Text>

        <Text style={styles.groupLabel}>Institution</Text>
        <TextField
          label="Institution Name"
          icon="business-outline"
          placeholder="University of Ghana"
          error={errors.institutionName}
          value={institutionName}
          onChangeText={(t) => {
            setInstitutionName(t);
            if (errors.institutionName) setErrors((e) => ({ ...e, institutionName: null }));
          }}
        />
        <TextField
          label="Email Domain"
          icon="globe-outline"
          placeholder="ug.edu.gh"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          helper="Students and staff self-register with an email on this domain."
          error={errors.emailDomain}
          value={emailDomain}
          onChangeText={(t) => {
            setEmailDomain(t);
            if (errors.emailDomain) setErrors((e) => ({ ...e, emailDomain: null }));
          }}
        />

        <Text style={styles.groupLabel}>First Admin</Text>
        <TextField
          label="Full Name"
          icon="person-outline"
          placeholder="Ama Serwaa Oyei"
          error={errors.adminFullName}
          value={adminFullName}
          onChangeText={(t) => {
            setAdminFullName(t);
            if (errors.adminFullName) setErrors((e) => ({ ...e, adminFullName: null }));
          }}
        />
        <TextField
          label="Email Address"
          icon="mail-outline"
          placeholder="admin@ug.edu.gh"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          helper="Must belong to the institution's own domain, above."
          error={errors.adminEmail}
          value={adminEmail}
          onChangeText={(t) => {
            setAdminEmail(t);
            if (errors.adminEmail) setErrors((e) => ({ ...e, adminEmail: null }));
          }}
        />
        <TextField
          label="Staff ID"
          icon="id-card-outline"
          placeholder="e.g. ADMIN001"
          autoCapitalize="characters"
          helper="Any institution-issued staff number"
          error={errors.adminStaffOrStudentId}
          value={adminStaffOrStudentId}
          onChangeText={(t) => {
            setAdminStaffOrStudentId(t);
            if (errors.adminStaffOrStudentId) setErrors((e) => ({ ...e, adminStaffOrStudentId: null }));
          }}
        />
        <TextField
          label="Department"
          icon="briefcase-outline"
          placeholder="Facilities (optional)"
          value={adminDepartment}
          onChangeText={setAdminDepartment}
        />
        <TextField
          label="Temporary Password"
          icon="lock-closed-outline"
          placeholder="••••••••"
          secure
          helper={`At least ${PASSWORD_MIN_LENGTH} characters`}
          error={errors.adminPassword}
          value={adminPassword}
          onChangeText={(t) => {
            setAdminPassword(t);
            if (errors.adminPassword) setErrors((e) => ({ ...e, adminPassword: null }));
          }}
        />

        {error && <Text style={styles.error}>{error}</Text>}
      </Screen>

      <View style={styles.footer}>
        <Button title="Create Institution" icon="business-outline" loading={saving} onPress={submit} />
      </View>

      <SuccessOverlay
        visible={created}
        title="Institution Created"
        subtitle={`${institutionName.trim()} is on CampusBook — ${adminFullName.trim()} can now sign in.`}
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
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
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
