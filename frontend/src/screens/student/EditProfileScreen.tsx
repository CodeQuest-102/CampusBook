import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar, Avatar, TextField, Button, KeyboardAvoider } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { usersApi, ApiError } from '../../api';
import { useApp } from '../../navigation/AppContext';
import { campusIdLabel } from '../../validation';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function EditProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, updateProfile, role } = useApp();

  const [name, setName] = useState(profile.name);
  const [email] = useState(profile.email);
  const [department, setDepartment] = useState(profile.department);
  const [saving, setSaving] = useState(false);

  const dirty =
    name.trim() !== profile.name || department.trim() !== profile.department;

  const save = async () => {
    setSaving(true);
    try {
      // Email is the login identity and isn't editable here; only name + department.
      await usersApi.updateMe({ fullName: name.trim() || profile.name, department: department.trim() });
      updateProfile({ name: name.trim() || profile.name, department: department.trim() });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not save', e instanceof ApiError ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoider>
      <TopBar variant="title" title="Edit Profile" onBack={() => navigation.goBack()} />
      <Screen scroll>
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            <Avatar name={name || profile.name} size={96} />
            <TouchableOpacity style={styles.cameraBadge} activeOpacity={0.8}>
              <Ionicons name="camera" size={15} color={colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Tap to change photo</Text>
        </View>

        <TextField
          label="Full Name"
          value={name}
          onChangeText={setName}
          icon="person-outline"
          placeholder="Your name"
          autoCapitalize="words"
        />
        <TextField
          label="Email Address"
          value={email}
          editable={false}
          icon="mail-outline"
          placeholder="you@yourinstitution.edu"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          // Institutional identity and a login handle — displayed, never edited.
          label={campusIdLabel(role)}
          value={profile.staffOrStudentId}
          editable={false}
          icon="id-card-outline"
          placeholder="—"
        />
        <TextField
          label="Department"
          value={department}
          onChangeText={setDepartment}
          icon="school-outline"
          placeholder="Department"
        />
      </Screen>

      <View style={styles.footer}>
        <Button title="Save Changes" onPress={save} disabled={!dirty} loading={saving} />
      </View>
    </KeyboardAvoider>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
  avatarWrap: { marginBottom: spacing.sm },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { ...typography.caption },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
  },
});
