import React, { useState } from 'react';
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar, Avatar, StatusPill, SearchBar, StateView } from '../../components';
import { colors, fontWeight, radius, shadow, spacing, typography } from '../../theme';
import { usersApi, userToDirectory } from '../../api';
import { useApiData } from '../../hooks/useApiData';
import type { DirectoryUser } from '../../data/placeholder';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Users'>;

/**
 * `role` is the exact `DirectoryUser['role']` value to match, not something
 * derived from the label — depluralising "Staff" gave "Staf", which matched
 * nobody and left the tab permanently empty.
 */
const TABS: { label: string; role: DirectoryUser['role'] | null }[] = [
  { label: 'All', role: null },
  { label: 'Students', role: 'Student' },
  { label: 'Staff', role: 'Staff' },
  { label: 'Admins', role: 'Admin' },
];

export default function UsersScreen({ navigation }: Props) {
  const [tab, setTab] = useState<string>('All');
  const [query, setQuery] = useState('');

  const { data, loading, refreshing, error, reload, refresh } = useApiData(async () =>
    (await usersApi.listUsers()).map(userToDirectory),
  );

  const q = query.trim().toLowerCase();
  const users = data ?? [];
  const activeRole = TABS.find((t) => t.label === tab)?.role ?? null;
  const filtered = users.filter((u) => {
    if (activeRole && u.role !== activeRole) return false;
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <TopBar
        variant="title"
        title="Users"
        onBack={() => navigation.goBack()}
        rightIcon="person-add-outline"
        onRight={() => navigation.navigate('AddUser')}
      />
      <Screen
        scroll
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        <SearchBar placeholder="Search users..." value={query} onChangeText={setQuery} />

        <View style={styles.tabs}>
          {TABS.map((t) => {
            const on = tab === t.label;
            return (
              <TouchableOpacity
                key={t.label}
                style={[styles.tab, on && styles.tabActive]}
                onPress={() => setTab(t.label)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, on && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <StateView
          loading={loading}
          error={error}
          onRetry={reload}
          empty={!loading && !error && filtered.length === 0}
          emptyText="No users found."
          emptyIcon="people-outline"
        />

        {!loading && !error && (
          <View style={{ marginTop: spacing.lg }}>
            {filtered.map((u) => (
              <View key={u.id} style={styles.card}>
                <Avatar name={u.name} size={44} color={u.avatarColor} />
                <View style={styles.info}>
                  <Text style={styles.name}>{u.name}</Text>
                  <Text style={styles.email} numberOfLines={1}>
                    {u.email}
                  </Text>
                  <Text style={styles.dept}>{u.department}</Text>
                </View>
                <StatusPill
                  label={u.role}
                  tone={u.role === 'Admin' ? 'neutral' : u.role === 'Staff' ? 'available' : 'pending'}
                />
              </View>
            ))}
          </View>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', marginTop: spacing.lg },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textSecondary, fontWeight: fontWeight.medium, fontSize: 12 },
  tabTextActive: { color: colors.white },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  info: { flex: 1, marginLeft: spacing.md },
  name: { ...typography.title, fontSize: 15 },
  email: { ...typography.caption, marginTop: 1 },
  dept: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
});
