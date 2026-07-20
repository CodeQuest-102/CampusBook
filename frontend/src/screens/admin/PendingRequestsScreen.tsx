import React, { useState } from 'react';
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar, Avatar, Button, StateView } from '../../components';
import { colors, fontWeight, radius, shadow, spacing, typography } from '../../theme';
import { bookingsApi, bookingToRequest } from '../../api';
import { useApiData } from '../../hooks/useApiData';
import type { BookingRequest } from '../../data/placeholder';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function PendingRequestsScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState('all');

  const { data, loading, refreshing, error, reload, refresh } = useApiData(async () =>
    (await bookingsApi.pendingBookings()).map(bookingToRequest),
  );

  const requests = data ?? [];
  const tabs = [
    { key: 'all', label: 'All', count: requests.length },
    { key: 'staff', label: 'Staff', count: requests.filter((r) => r.requesterRole === 'Staff').length },
    {
      key: 'students',
      label: 'Students',
      count: requests.filter((r) => r.requesterRole === 'Student').length,
    },
  ];

  const filtered = requests.filter((r) =>
    tab === 'all'
      ? true
      : tab === 'staff'
      ? r.requesterRole === 'Staff'
      : r.requesterRole === 'Student',
  );

  return (
    <>
      <TopBar variant="title" title="Pending Requests" />
      <Screen
        scroll
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.tabs}>
          {tabs.map((t) => {
            const on = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, on && styles.tabActive]}
                onPress={() => setTab(t.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, on && styles.tabTextActive]}>
                  {t.label} ({t.count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <StateView
          loading={loading}
          error={error}
          onRetry={reload}
          empty={!loading && !error && filtered.length === 0}
          emptyText="No pending requests."
          emptyIcon="checkmark-done-outline"
        />

        {!loading && !error && (
          <View style={{ marginTop: spacing.lg }}>
            {filtered.map((r) => (
              <RequestRow
                key={r.id}
                request={r}
                onView={() => navigation.navigate('RequestDetails', { request: r })}
              />
            ))}
          </View>
        )}
      </Screen>
    </>
  );
}

function RequestRow({ request, onView }: { request: BookingRequest; onView: () => void }) {
  return (
    <View style={styles.card}>
      <Avatar name={request.requesterName} size={44} color={request.avatarColor} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {request.requesterName}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {request.building} · {request.roomName}
        </Text>
        <Text style={styles.meta}>
          {request.date} · {request.startTime} — {request.endTime}
        </Text>
        <Text style={styles.purpose}>{request.purpose}</Text>
      </View>
      <Button title="View" variant="secondary" size="md" fullWidth={false} onPress={onView} style={styles.viewBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', marginTop: spacing.sm },
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
  sub: { ...typography.bodyMuted, fontSize: 13, marginTop: 1 },
  meta: { ...typography.caption, marginTop: 3 },
  purpose: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  viewBtn: { alignSelf: 'center', paddingHorizontal: spacing.xl },
});
