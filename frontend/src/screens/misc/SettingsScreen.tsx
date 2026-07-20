import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const groups: {
    title: string;
    rows: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; onPress?: () => void }[];
  }[] = [
    {
      title: 'Account',
      rows: [
        { icon: 'person-outline', label: 'Edit Profile', onPress: () => navigation.navigate('Main', { screen: 'Profile' }) },
        { icon: 'key-outline', label: 'Change Password', onPress: () => navigation.navigate('ForgotPassword') },
        { icon: 'options-outline', label: 'Preferences', onPress: () => navigation.navigate('Preferences') },
      ],
    },
    {
      title: 'General',
      rows: [
        { icon: 'language-outline', label: 'Language', value: 'English' },
        { icon: 'shield-checkmark-outline', label: 'Privacy & Security' },
        { icon: 'information-circle-outline', label: 'About', value: 'v1.0.0' },
      ],
    },
  ];

  return (
    <>
      <TopBar variant="title" title="Settings" onBack={() => navigation.goBack()} />
      <Screen scroll>
        {groups.map((g) => (
          <View key={g.title}>
            <Text style={styles.groupTitle}>{g.title}</Text>
            <View style={styles.card}>
              {g.rows.map((r, i) => (
                <TouchableOpacity
                  key={r.label}
                  style={[styles.row, i < g.rows.length - 1 && styles.rowBorder]}
                  activeOpacity={r.onPress ? 0.7 : 1}
                  onPress={r.onPress}
                >
                  <View style={styles.icon}>
                    <Ionicons name={r.icon} size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.label}>{r.label}</Text>
                  {r.value && <Text style={styles.value}>{r.value}</Text>}
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  groupTitle: { ...typography.label, marginTop: spacing.xl, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  label: { flex: 1, ...typography.body, fontWeight: '500' },
  value: { ...typography.bodyMuted, fontSize: 13, marginRight: spacing.sm },
});
