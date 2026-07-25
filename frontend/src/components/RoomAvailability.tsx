import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import { hallsApi, availabilityToSchedule, toLocalDateString, ApiError } from '../api';
import type { ScheduleEntry } from '../data/types';

/**
 * When a room is already taken on a given day.
 *
 * Reloads whenever the date changes, which is why it doesn't use `useApiData` —
 * that hook fires on screen focus, so a date picked without leaving the screen
 * would never refetch.
 *
 * Slots are deliberately unattributed (see `availabilityToSchedule`): the point
 * is to show a clash before someone requests it, not to publish who booked what.
 */
export default function RoomAvailability({ roomId, date }: { roomId: string; date: Date }) {
  const [slots, setSlots] = useState<ScheduleEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateKey = toLocalDateString(date);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    hallsApi
      .getAvailability(roomId, dateKey)
      .then((a) => {
        if (active) setSlots(availabilityToSchedule(a));
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof ApiError ? e.message : 'Could not check availability.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // A date flipped mid-request must not have its answer overwritten by the
    // older one landing late.
    return () => {
      active = false;
    };
  }, [roomId, dateKey]);

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }

  if (!slots || slots.length === 0) {
    return (
      <View style={styles.free}>
        <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
        <Text style={styles.freeText}>Free all day</Text>
      </View>
    );
  }

  return (
    <View>
      {slots.map((s) => (
        <View key={s.id} style={styles.slot}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.textTertiary} />
          <Text style={styles.slotTime}>
            {s.startTime} — {s.endTime}
          </Text>
          <Text style={styles.slotLabel}>Booked</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  state: { paddingVertical: spacing.lg, alignItems: 'center' },
  error: { ...typography.caption, color: colors.danger, paddingVertical: spacing.sm },
  free: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  freeText: { ...typography.body, color: colors.success, marginLeft: spacing.sm },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  slotTime: { ...typography.body, fontSize: 14, flex: 1, marginLeft: spacing.sm },
  slotLabel: { ...typography.caption, color: colors.textTertiary },
});
