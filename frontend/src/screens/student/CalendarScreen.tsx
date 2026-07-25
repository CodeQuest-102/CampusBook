import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar, StateView } from '../../components';
import { bookingTone } from '../../components/StatusPill';
import { colors, fontWeight, radius, shadow, spacing, typography } from '../../theme';
import { bookingsApi, bookingToSchedule } from '../../api';
import { useApiData } from '../../hooks/useApiData';
import type { ScheduleEntry } from '../../data/types';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export default function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const { data, loading, error, reload } = useApiData(async () => {
    const bookings = await bookingsApi.myBookings();
    // Group schedule entries by day key.
    const byDay: Record<string, ScheduleEntry[]> = {};
    for (const b of bookings) {
      const [datePart] = b.startTime.split('T');
      (byDay[datePart] ||= []).push(bookingToSchedule(b));
    }
    return byDay;
  });

  const byDay = data ?? {};

  const { cells, bookedDays } = useMemo(() => {
    const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const cells: (number | null)[] = [
      ...Array(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    const bookedDays = new Set<number>();
    for (let d = 1; d <= daysInMonth; d++) {
      if (byDay[keyOf(cursor.year, cursor.month, d)]?.length) bookedDays.add(d);
    }
    return { cells, bookedDays };
  }, [cursor, byDay]);

  const selectedKey = keyOf(cursor.year, cursor.month, selectedDay);
  const selectedEntries = byDay[selectedKey] ?? [];
  const monthLabel = `${MONTHS_FULL[cursor.month]} ${cursor.year}`;

  const shiftMonth = (delta: number) => {
    setCursor((c) => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
    setSelectedDay(1);
  };

  const goToday = () => {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setSelectedDay(today.getDate());
  };

  return (
    <>
      <TopBar variant="title" title="Calendar" rightIcon="today-outline" onRight={goToday} />
      <Screen scroll>
        <View style={styles.calendar}>
          <View style={styles.monthRow}>
            <TouchableOpacity hitSlop={8} onPress={() => shiftMonth(-1)}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.month}>{monthLabel}</Text>
            <TouchableOpacity hitSlop={8} onPress={() => shiftMonth(1)}>
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
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
              const isSelected = day === selectedDay;
              const isBooked = bookedDays.has(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={styles.cell}
                  onPress={() => setSelectedDay(day)}
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
          {selectedDay} {monthLabel}
        </Text>

        <StateView loading={loading} error={error} onRetry={reload} />

        {!loading && !error && selectedEntries.length === 0 && (
          <Text style={styles.empty}>No bookings on this day.</Text>
        )}

        {!loading &&
          !error &&
          selectedEntries.map((e) => {
            const tone = bookingTone(e.status);
            const barColor =
              tone === 'available' ? colors.success : tone === 'pending' ? colors.warning : colors.danger;
            return (
              <TouchableOpacity
                key={e.id}
                style={styles.event}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('DaySchedule', {
                    date: `${selectedDay} ${monthLabel}`,
                    entries: selectedEntries,
                  })
                }
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
          })}
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
