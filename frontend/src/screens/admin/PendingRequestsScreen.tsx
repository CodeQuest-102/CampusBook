import React, { useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar, Avatar, Button, StateView } from '../../components';
import { colors, fontWeight, radius, shadow, spacing, typography } from '../../theme';
import { bookingsApi, bookingToRequest, ApiError } from '../../api';
import { useApiData } from '../../hooks/useApiData';
import type { BookingRequest } from '../../data/placeholder';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function PendingRequestsScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState('all');

  // Selection mode: null when off, otherwise the set of selected request ids.
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);

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

  const selecting = selected !== null;

  const toggleSelect = (id: string) => {
    setSelected((cur) => {
      const next = new Set(cur ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startSelecting = (id: string) => setSelected(new Set([id]));
  const cancelSelecting = () => setSelected(null);
  const selectAllVisible = () => setSelected(new Set(filtered.map((r) => r.id)));

  /**
   * Run a bulk action and report the per-id outcome. Some ids can fail while
   * others succeed (typically a slot taken by another approval), so the summary
   * names what didn't go through rather than claiming blanket success.
   */
  const runBulk = async (kind: 'approve' | 'reject') => {
    const ids = Array.from(selected ?? []);
    if (ids.length === 0) return;

    setBusy(true);
    try {
      const result =
        kind === 'approve'
          ? await bookingsApi.bulkApprove(ids)
          : await bookingsApi.bulkReject(ids);

      const verb = kind === 'approve' ? 'Approved' : 'Rejected';
      if (result.failed.length === 0) {
        Alert.alert('Done', `${verb} ${result.succeeded.length} request(s).`);
      } else {
        const names = result.failed
          .map((f) => {
            const req = requests.find((r) => r.id === String(f.id));
            return `• ${req ? `${req.requesterName} (${req.roomName})` : `#${f.id}`}: ${f.reason}`;
          })
          .join('\n');
        Alert.alert(
          `${verb} ${result.succeeded.length} of ${result.requested}`,
          `${result.failed.length} could not be processed:\n\n${names}`,
        );
      }
      setSelected(null);
      reload();
    } catch (e) {
      Alert.alert('Could not complete', e instanceof ApiError ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const selectedCount = selected?.size ?? 0;

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

        {filtered.length > 0 && (
          <View style={styles.selectBar}>
            {selecting ? (
              <>
                <Text style={styles.selectCount}>{selectedCount} selected</Text>
                <TouchableOpacity onPress={selectAllVisible} hitSlop={8}>
                  <Text style={styles.selectAction}>Select all</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={cancelSelecting} hitSlop={8}>
                  <Text style={[styles.selectAction, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => setSelected(new Set())}
                hitSlop={8}
                style={{ marginLeft: 'auto' }}
              >
                <Text style={styles.selectAction}>Select</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <StateView
          loading={loading}
          error={error}
          onRetry={reload}
          empty={!loading && !error && filtered.length === 0}
          emptyText="No pending requests."
          emptyIcon="checkmark-done-outline"
        />

        {!loading && !error && (
          <View style={{ marginTop: spacing.sm }}>
            {filtered.map((r) => (
              <RequestRow
                key={r.id}
                request={r}
                selecting={selecting}
                selected={selected?.has(r.id) ?? false}
                onToggle={() => toggleSelect(r.id)}
                onLongPress={() => startSelecting(r.id)}
                onView={() => navigation.navigate('RequestDetails', { request: r })}
              />
            ))}
          </View>
        )}
      </Screen>

      {selecting && selectedCount > 0 && (
        <View style={styles.actionBar}>
          <Button
            title={`Reject (${selectedCount})`}
            variant="danger"
            loading={busy}
            onPress={() => runBulk('reject')}
            style={{ flex: 1, marginRight: spacing.sm }}
          />
          <Button
            title={`Approve (${selectedCount})`}
            loading={busy}
            onPress={() => runBulk('approve')}
            style={{ flex: 1 }}
          />
        </View>
      )}
    </>
  );
}

function RequestRow({
  request,
  selecting,
  selected,
  onToggle,
  onLongPress,
  onView,
}: {
  request: BookingRequest;
  selecting: boolean;
  selected: boolean;
  onToggle: () => void;
  onLongPress: () => void;
  onView: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      activeOpacity={selecting ? 0.7 : 1}
      onPress={selecting ? onToggle : undefined}
      onLongPress={onLongPress}
      delayLongPress={300}
    >
      {selecting ? (
        <Ionicons
          name={selected ? 'checkbox' : 'square-outline'}
          size={24}
          color={selected ? colors.primary : colors.border}
          style={styles.checkbox}
        />
      ) : (
        <Avatar name={request.requesterName} size={44} color={request.avatarColor} />
      )}
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
      {!selecting && (
        <Button
          title="View"
          variant="secondary"
          size="md"
          fullWidth={false}
          onPress={onView}
          style={styles.viewBtn}
        />
      )}
    </TouchableOpacity>
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

  selectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  selectCount: { ...typography.label, fontWeight: fontWeight.semibold, marginRight: 'auto' },
  selectAction: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: 13 },

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
  cardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  checkbox: { alignSelf: 'center', width: 44, textAlign: 'center' },
  info: { flex: 1, marginLeft: spacing.md },
  name: { ...typography.title, fontSize: 15 },
  sub: { ...typography.bodyMuted, fontSize: 13, marginTop: 1 },
  meta: { ...typography.caption, marginTop: 3 },
  purpose: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  viewBtn: { alignSelf: 'center', paddingHorizontal: spacing.xl },

  actionBar: {
    flexDirection: 'row',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
