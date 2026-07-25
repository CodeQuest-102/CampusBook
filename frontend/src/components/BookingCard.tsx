import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, radius, shadow, spacing, typography } from '../theme';
import StatusPill, { bookingTone } from './StatusPill';
import { Booking } from '../data/types';

interface Props {
  booking: Booking;
  onPress?: () => void;
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** Row summarising a single booking — room, time and status pill. */
export default function BookingCard({ booking, onPress }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.card}>
      <View style={styles.thumb}>
        <Ionicons name="calendar-outline" size={22} color={colors.primary} />
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.room} numberOfLines={1}>
            {booking.building}
          </Text>
          <StatusPill label={statusLabel(booking.status)} tone={bookingTone(booking.status)} />
        </View>
        <Text style={styles.sub} numberOfLines={1}>
          {booking.purpose}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
          <Text style={styles.meta}>
            {booking.date} · {booking.startTime} — {booking.endTime}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  body: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  room: { ...typography.title, fontSize: fontSize.md, flex: 1, marginRight: spacing.sm },
  sub: { ...typography.bodyMuted, fontSize: fontSize.sm, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  meta: { ...typography.caption, marginLeft: 4 },
});
