import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, fontSize, fontWeight, spacing } from '../theme';

/** Maps route names → tab icon + label. Shared by every role's tab bar. */
const TAB_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  Home: { icon: 'home', label: 'Home' },
  Bookings: { icon: 'bookmark', label: 'Bookings' },
  Calendar: { icon: 'calendar', label: 'Calendar' },
  Notifications: { icon: 'notifications', label: 'Notifications' },
  Profile: { icon: 'person', label: 'Profile' },
  Rooms: { icon: 'grid', label: 'Rooms' },
  Requests: { icon: 'file-tray-full', label: 'Requests' },
  Reports: { icon: 'bar-chart', label: 'Reports' },
  More: { icon: 'ellipsis-horizontal', label: 'More' },
};

/**
 * Custom bottom tab bar rendered by React Navigation (`tabBar` prop).
 * Keeps the whole app on one consistent nav look regardless of role.
 */
export default function BottomNav({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = TAB_META[route.name] ?? { icon: 'ellipse', label: route.name };
        const iconName = (focused ? meta.icon : `${meta.icon}-outline`) as keyof typeof Ionicons.glyphMap;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity key={route.key} style={styles.tab} onPress={onPress} activeOpacity={0.7}>
            <Ionicons
              name={iconName}
              size={22}
              color={focused ? colors.primary : colors.textTertiary}
            />
            <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
              {meta.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: {
    fontSize: 10,
    marginTop: 3,
    color: colors.textTertiary,
    fontWeight: fontWeight.medium,
  },
  labelActive: { color: colors.primary, fontWeight: fontWeight.semibold },
});
