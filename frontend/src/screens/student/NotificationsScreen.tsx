import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, TopBar, StateView } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { notificationsApi, notificationToUi } from '../../api';
import { useApiData } from '../../hooks/useApiData';
import type { AppNotification, NotificationType } from '../../data/placeholder';

const ICONS: Record<NotificationType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> =
  {
    approved: { icon: 'checkmark-circle', color: colors.success, bg: colors.successSoft },
    rejected: { icon: 'close-circle', color: colors.danger, bg: colors.dangerSoft },
    reminder: { icon: 'alarm', color: colors.warning, bg: colors.warningSoft },
    message: { icon: 'chatbubble-ellipses', color: colors.primary, bg: colors.primarySoft },
    cancelled: { icon: 'ban', color: colors.danger, bg: colors.dangerSoft },
  };

export default function NotificationsScreen() {
  const { data, loading, error, reload } = useApiData(async () =>
    (await notificationsApi.listNotifications()).map(notificationToUi),
  );

  // Local copy so read-state updates feel instant.
  const [items, setItems] = useState<AppNotification[]>([]);
  useEffect(() => {
    if (data) setItems(data);
  }, [data]);

  const markAllRead = async () => {
    setItems((cur) => cur.map((n) => ({ ...n, read: true })));
    try {
      await notificationsApi.markAllAsRead();
    } catch {
      reload();
    }
  };

  const markRead = async (id: string) => {
    setItems((cur) => cur.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await notificationsApi.markAsRead(id);
    } catch {
      reload();
    }
  };

  return (
    <>
      <TopBar variant="title" title="Notifications" />
      <Screen scroll>
        <TouchableOpacity style={styles.markAll} hitSlop={8} onPress={markAllRead}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>

        <StateView
          loading={loading}
          error={error}
          onRetry={reload}
          empty={!loading && !error && items.length === 0}
          emptyText="No notifications yet."
          emptyIcon="notifications-outline"
        />

        {!loading &&
          !error &&
          items.map((n) => {
            const meta = ICONS[n.type];
            return (
              <TouchableOpacity
                key={n.id}
                style={styles.item}
                activeOpacity={0.7}
                onPress={() => markRead(n.id)}
              >
                <View style={[styles.icon, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={20} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title}>{n.title}</Text>
                    <Text style={styles.time}>{n.time}</Text>
                  </View>
                  <Text style={styles.body}>{n.body}</Text>
                </View>
                {!n.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          })}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  markAll: { alignSelf: 'flex-end', marginBottom: spacing.sm },
  markAllText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.title, fontSize: 15 },
  time: { ...typography.caption },
  body: { ...typography.bodyMuted, fontSize: 13, marginTop: 2, lineHeight: 18 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
    marginTop: 6,
  },
});
