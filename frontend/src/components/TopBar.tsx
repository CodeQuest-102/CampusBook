import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, spacing, typography } from '../theme';
import Avatar from './Avatar';

interface GreetingProps {
  variant: 'greeting';
  greeting: string; // "Good Morning,"
  name: string;
  userColor?: string;
  onProfile?: () => void;
  onNotifications?: () => void;
  notificationCount?: number;
}

interface TitleProps {
  variant: 'title';
  title: string;
  onBack?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRight?: () => void;
}

type Props = GreetingProps | TitleProps;

/**
 * App header. Two shapes:
 *  - "greeting": dashboard header with avatar + notification bell
 *  - "title":    detail-screen header with back button + optional right action
 */
export default function TopBar(props: Props) {
  const insets = useSafeAreaInsets();
  const paddingTop = insets.top + spacing.sm;

  if (props.variant === 'greeting') {
    return (
      <View style={[styles.container, { paddingTop }]}>
        <View>
          <Text style={styles.greeting}>{props.greeting}</Text>
          <Text style={styles.name}>{props.name}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={props.onNotifications} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {!!props.notificationCount && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{props.notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={props.onProfile} hitSlop={8}>
            <Avatar name={props.name} size={38} color={props.userColor} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop }]}>
      <TouchableOpacity onPress={props.onBack} style={styles.iconBtn} hitSlop={8}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>
        {props.title}
      </Text>
      {props.rightIcon ? (
        <TouchableOpacity onPress={props.onRight} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name={props.rightIcon} size={22} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconBtn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  greeting: { ...typography.bodyMuted, fontSize: fontSize.sm },
  name: { ...typography.h3, marginTop: 1 },
  title: { ...typography.title, flex: 1, textAlign: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: '700' },
});
