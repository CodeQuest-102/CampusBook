import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontWeight, spacing, typography } from '../theme';
import { bookingsApi } from '../api';
import type { BookingAuditAction, BookingAuditResponse } from '../api/types';

const ACTION_META: Record<
  BookingAuditAction,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  CREATED: { label: 'Requested', icon: 'add-circle', color: colors.primary },
  APPROVED: { label: 'Approved', icon: 'checkmark-circle', color: colors.success },
  REJECTED: { label: 'Rejected', icon: 'close-circle', color: colors.danger },
  CANCELLED: { label: 'Cancelled', icon: 'ban', color: colors.maintenance },
  RESCHEDULED: { label: 'Rescheduled', icon: 'time', color: colors.warning },
};

/** "23 Jul 2026, 10:04" — audit timestamps are ISO strings from the API. */
function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * A booking's audit trail as a timeline. Renders nothing at all when there's no
 * history (e.g. a booking made before auditing existed), so it can be dropped
 * into a detail screen unconditionally.
 */
export default function BookingHistory({ bookingId }: { bookingId: number | string }) {
  const [entries, setEntries] = useState<BookingAuditResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const history = await bookingsApi.bookingHistory(bookingId);
        if (active) setEntries(history);
      } catch {
        // History is supplementary — a failure here shouldn't break the screen.
        if (active) setEntries([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [bookingId]);

  if (loading) {
    return <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.primary} />;
  }
  if (entries.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>History</Text>
      {entries.map((entry, i) => {
        const meta = ACTION_META[entry.action];
        const isLast = i === entries.length - 1;
        return (
          <View key={entry.id} style={styles.row}>
            <View style={styles.rail}>
              <Ionicons name={meta.icon} size={18} color={meta.color} />
              {!isLast && <View style={styles.line} />}
            </View>
            <View style={styles.content}>
              <Text style={styles.action}>
                {meta.label}
                {entry.actorName ? <Text style={styles.actor}> by {entry.actorName}</Text> : null}
              </Text>
              <Text style={styles.when}>{formatWhen(entry.createdAt)}</Text>
              {entry.details ? <Text style={styles.details}>{entry.details}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.xl },
  heading: { ...typography.title, marginBottom: spacing.md },
  row: { flexDirection: 'row' },
  rail: { width: 28, alignItems: 'center' },
  line: { flex: 1, width: 2, backgroundColor: colors.divider, marginTop: 2 },
  content: { flex: 1, paddingBottom: spacing.lg },
  action: { ...typography.body, fontWeight: fontWeight.semibold },
  actor: { fontWeight: fontWeight.regular, color: colors.textSecondary },
  when: { ...typography.caption, marginTop: 2 },
  details: { ...typography.bodyMuted, fontSize: 13, marginTop: 4, lineHeight: 18 },
});
