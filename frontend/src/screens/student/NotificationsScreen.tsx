import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TopBar, StateView } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { notificationsApi, notificationToUi } from '../../api';
import { useApiList } from '../../hooks/useApiList';
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
  const {
    items,
    loading,
    refreshing,
    loadingMore,
    error,
    reload,
    refresh,
    loadMore,
    patchItems,
  } = useApiList(
    (page) => notificationsApi.listNotifications(page),
    notificationToUi,
  );

  const markAllRead = async () => {
    patchItems((cur) => cur.map((n) => ({ ...n, read: true })));
    try {
      await notificationsApi.markAllAsRead();
    } catch {
      reload();
    }
  };

  const markRead = async (id: string) => {
    patchItems((cur) => cur.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await notificationsApi.markAsRead(id);
    } catch {
      reload();
    }
  };

  const renderItem = ({ item: n }: { item: AppNotification }) => {
    const meta = ICONS[n.type];
    return (
      <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={() => markRead(n.id)}>
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
  };

  return (
    <>
      <TopBar variant="title" title="Notifications" />
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <FlatList
          data={loading || error ? [] : items}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
          }
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          ListHeaderComponent={
            items.length > 0 ? (
              <TouchableOpacity style={styles.markAll} hitSlop={8} onPress={markAllRead}>
                <Text style={styles.markAllText}>Mark all as read</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <StateView
              loading={loading}
              error={error}
              onRetry={reload}
              empty={!loading && !error && items.length === 0}
              emptyText="No notifications yet."
              emptyIcon="notifications-outline"
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.primary} />
            ) : null
          }
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, flexGrow: 1 },
  markAll: { alignSelf: 'flex-end', marginVertical: spacing.sm },
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
