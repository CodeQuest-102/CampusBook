import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar } from '../../components';
import { bookingTone } from '../../components/StatusPill';
import { colors, fontWeight, radius, spacing, typography } from '../../theme';
import { daySchedule } from '../../data/placeholder';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'DaySchedule'>;

// Time rail from 8am to 6pm.
const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i);
const fmt = (h: number) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'AM' : 'PM'}`;

export default function DayScheduleScreen({ route, navigation }: Props) {
  const { date } = route.params;

  return (
    <>
      <TopBar variant="title" title={date} onBack={() => navigation.goBack()} />
      <Screen scroll>
        <View style={styles.dateStrip}>
          {[
            { d: 15, w: 'Fri' },
            { d: 16, w: 'Sat', active: true },
            { d: 17, w: 'Sun' },
          ].map((x) => (
            <View key={x.d} style={[styles.dateChip, x.active && styles.dateChipActive]}>
              <Text style={[styles.dateNum, x.active && styles.dateOnActive]}>{x.d}</Text>
              <Text style={[styles.dateW, x.active && styles.dateOnActive]}>{x.w}</Text>
            </View>
          ))}
        </View>

        <View style={styles.rail}>
          {HOURS.map((h) => {
            const entry = daySchedule.find((e) => e.startTime === fmt(h));
            const tone = entry ? bookingTone(entry.status) : 'neutral';
            const barColor =
              tone === 'available'
                ? colors.success
                : tone === 'pending'
                ? colors.warning
                : colors.danger;
            return (
              <View key={h} style={styles.hourRow}>
                <Text style={styles.hourLabel}>{fmt(h)}</Text>
                <View style={styles.hourLineWrap}>
                  <View style={styles.hourLine} />
                  {entry && (
                    <View style={[styles.block, { borderLeftColor: barColor }]}>
                      <Text style={styles.blockRoom}>{entry.roomName}</Text>
                      <Text style={styles.blockPurpose}>
                        {entry.purpose} · {entry.startTime} — {entry.endTime}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  dateStrip: { flexDirection: 'row', justifyContent: 'center', marginVertical: spacing.lg },
  dateChip: {
    width: 56,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateNum: { ...typography.title, color: colors.text },
  dateW: { ...typography.caption, marginTop: 2 },
  dateOnActive: { color: colors.white },
  rail: { marginTop: spacing.sm },
  hourRow: { flexDirection: 'row', minHeight: 54 },
  hourLabel: { width: 64, ...typography.caption, paddingTop: 2 },
  hourLineWrap: { flex: 1, justifyContent: 'flex-start' },
  hourLine: { height: 1, backgroundColor: colors.divider, marginBottom: spacing.sm },
  block: {
    backgroundColor: colors.primarySoft,
    borderLeftWidth: 4,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  blockRoom: { fontWeight: fontWeight.semibold, color: colors.text, fontSize: 14 },
  blockPurpose: { ...typography.caption, marginTop: 2 },
});
