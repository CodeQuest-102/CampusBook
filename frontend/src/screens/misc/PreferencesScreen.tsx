import React, { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Preferences'>;

const ITEMS: { key: string; icon: keyof typeof Ionicons.glyphMap; label: string; desc: string; default: boolean }[] = [
  { key: 'push', icon: 'notifications-outline', label: 'Push Notifications', desc: 'Booking updates on this device', default: true },
  { key: 'email', icon: 'mail-outline', label: 'Email Alerts', desc: 'Get emails for approvals & rejections', default: true },
  { key: 'reminders', icon: 'alarm-outline', label: 'Booking Reminders', desc: 'Remind me before a booking starts', default: true },
  { key: 'dark', icon: 'moon-outline', label: 'Dark Mode', desc: 'Use a darker app theme', default: false },
];

export default function PreferencesScreen({ navigation }: Props) {
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(ITEMS.map((i) => [i.key, i.default]))
  );

  return (
    <>
      <TopBar variant="title" title="Preferences" onBack={() => navigation.goBack()} />
      <Screen scroll>
        <View style={styles.card}>
          {ITEMS.map((item, i) => (
            <View key={item.key} style={[styles.row, i < ITEMS.length - 1 && styles.rowBorder]}>
              <View style={styles.icon}>
                <Ionicons name={item.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.text}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.desc}>{item.desc}</Text>
              </View>
              <Switch
                value={state[item.key]}
                onValueChange={(v) => setState((s) => ({ ...s, [item.key]: v }))}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={colors.white}
              />
            </View>
          ))}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
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
  text: { flex: 1, paddingRight: spacing.md },
  label: { ...typography.body, fontWeight: '600' },
  desc: { ...typography.caption, marginTop: 2 },
});
