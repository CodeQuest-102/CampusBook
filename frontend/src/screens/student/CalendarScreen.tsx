import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar } from '../../components';
import { bookingTone } from '../../components/StatusPill';
import { colors, fontWeight, radius, shadow, spacing, typography } from '../../theme';
import { daySchedule } from '../../data/placeholder';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// A couple of months so the prev/next arrows have somewhere to go (mock data).
const MONTHS = [
  { label: 'April 2026', firstWeekday: 3, days: 30, booked: [8, 22] },
  { label: 'May 2026', firstWeekday: 5, days: 31, booked: [16, 20] },
  { label: 'June 2026', firstWeekday: 1, days: 30, booked: [3] },
];
const DEFAULT_MONTH = 1; // May

export default function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const [monthIndex, setMonthIndex] = useState(DEFAULT_MONTH);
  const [selected, setSelected] = useState(16);

  const month = MONTHS[monthIndex];
  const goToday = () => {
    setMonthIndex(DEFAULT_MONTH);
    setSelected(16);
  };

  const cells: (number | null)[] = [
    ...Array(month.firstWeekday).fill(null),
    ...Array.from({ length: month.days }, (_, i) => i + 1),
  ];

  return (
    <>
      <TopBar variant="title" title="Calendar" rightIcon="today-outline" onRight={goToday} />
      <Screen scroll>
        <View style={styles.calendar}>
          <View style={styles.monthRow}>
            <TouchableOpacity
              hitSlop={8}
              disabled={monthIndex === 0}
              onPress={() => setMonthIndex((m) => Math.max(0, m - 1))}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={monthIndex === 0 ? colors.textTertiary : colors.text}
              />
            </TouchableOpacity>
            <Text style={styles.month}>{month.label}</Text>
            <TouchableOpacity
              hitSlop={8}
              disabled={monthIndex === MONTHS.length - 1}
              onPress={() => setMonthIndex((m) => Math.min(MONTHS.length - 1, m + 1))}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={monthIndex === MONTHS.length - 1 ? colors.textTertiary : colors.text}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} style={styles.weekday}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={`e${i}`} style={styles.cell} />;
              const isSelected = day === selected;
              const isBooked = month.booked.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={styles.cell}
                  onPress={() => setSelected(day)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dayCircle, isSelected && styles.dayCircleActive]}>
                    <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>{day}</Text>
                  </View>
                  {isBooked && <View style={[styles.dot, isSelected && styles.dotOnActive]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          {selected} {month.label}
        </Text>

        {monthIndex === DEFAULT_MONTH && selected === 16 ? (
          daySchedule.map((e) => {
            const tone = bookingTone(e.status);
            const barColor =
              tone === 'available' ? colors.success : tone === 'pending' ? colors.warning : colors.danger;
            return (
              <TouchableOpacity
                key={e.id}
                style={styles.event}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('DaySchedule', { date: '16 May 2026' })}
              >
                <View style={[styles.eventBar, { backgroundColor: barColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTime}>
                    {e.startTime} — {e.endTime}
                  </Text>
                  <Text style={styles.eventRoom}>{e.roomName}</Text>
                  <Text style={styles.eventPurpose}>{e.purpose}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={styles.empty}>No bookings on this day.</Text>
        )}
      </Screen>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('BrowseRooms')}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  calendar: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadow.card,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  month: { ...typography.title },
  weekRow: { flexDirection: 'row', marginBottom: spacing.sm },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: fontWeight.medium,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: { backgroundColor: colors.primary },
  dayText: { color: colors.text, fontSize: 14 },
  dayTextActive: { color: colors.white, fontWeight: fontWeight.semibold },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.success, marginTop: 2 },
  dotOnActive: { backgroundColor: colors.white },
  sectionTitle: { ...typography.title, marginTop: spacing.xl, marginBottom: spacing.md },
  event: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  eventBar: { width: 4, borderRadius: 2, marginRight: spacing.md },
  eventTime: { ...typography.label, color: colors.text, fontWeight: fontWeight.semibold },
  eventRoom: { ...typography.body, marginTop: 2 },
  eventPurpose: { ...typography.caption, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.textTertiary, marginTop: spacing.xl },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.raised,
  },
});
