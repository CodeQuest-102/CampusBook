import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar, Avatar } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { useApp } from '../../navigation/AppContext';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type RowKey = 'bookings' | 'requests' | 'preferences' | 'settings' | 'help';
const ROWS: { key: RowKey; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: 'bookings', icon: 'bookmark-outline', label: 'My Bookings' },
  { key: 'requests', icon: 'file-tray-full-outline', label: 'My Requests' },
  { key: 'preferences', icon: 'options-outline', label: 'Preferences' },
  { key: 'settings', icon: 'settings-outline', label: 'Settings' },
  { key: 'help', icon: 'help-circle-outline', label: 'Help & Support' },
];

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { displayName, role, profile } = useApp();
  const roleLabel =
    role === 'staff'
      ? `${profile.department} · Staff`
      : role === 'admin'
      ? 'Administrator'
      : `${profile.department} · Student`;

  return (
    <>
      <TopBar variant="title" title="Profile" />
      <Screen scroll>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatarWrap}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Avatar name={displayName} size={88} />
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={13} color={colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.role}>{roleLabel}</Text>
        </View>

        <View style={styles.menu}>
          {ROWS.map((r, i) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.row, i < ROWS.length - 1 && styles.rowBorder]}
              activeOpacity={0.7}
              onPress={() => {
                switch (r.key) {
                  case 'bookings':
                    return navigation.navigate('Main', {
                      screen: role === 'admin' ? 'Requests' : 'Bookings',
                    });
                  case 'requests':
                    return navigation.navigate('MyRequests');
                  case 'preferences':
                    return navigation.navigate('Preferences');
                  case 'settings':
                    return navigation.navigate('Settings');
                  case 'help':
                    return navigation.navigate('HelpSupport');
                }
              }}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={r.icon} size={20} color={colors.primary} />
              </View>
              <Text style={styles.rowLabel}>{r.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logout}
          activeOpacity={0.7}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
  avatarWrap: { marginBottom: spacing.md },
  editBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.h3 },
  role: { ...typography.bodyMuted, marginTop: 2 },
  menu: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowLabel: { flex: 1, ...typography.body, fontWeight: '500' },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
  },
  logoutText: { color: colors.danger, fontWeight: '600', marginLeft: spacing.sm },
});
