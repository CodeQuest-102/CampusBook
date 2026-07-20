import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import Button from './Button';

/* -------------------------------------------------------------------------- */
/*  Date helpers (shared by the booking + reschedule flows)                   */
/* -------------------------------------------------------------------------- */

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "15 May 2026" */
export const formatDate = (d: Date) =>
  `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;

/** Parse a "15 May 2026" style string back into a Date (falls back to today). */
export const parseDate = (s?: string): Date => {
  const m = s?.match(/(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/);
  if (m) {
    const month = MONTHS_SHORT.findIndex(
      (x) => x.toLowerCase() === m[2].slice(0, 3).toLowerCase()
    );
    if (month >= 0) return new Date(parseInt(m[3], 10), month, parseInt(m[1], 10));
  }
  return new Date();
};

/* -------------------------------------------------------------------------- */
/*  Calendar date picker                                                      */
/* -------------------------------------------------------------------------- */

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Month grid date picker themed to CampusBook. */
export function CalendarPicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (d: Date) => void;
}) {
  const [view, setView] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const today = useMemo(() => new Date(), []);

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  // Build a 6-row (42 cell) grid so height stays constant across months.
  const cells: { day: number; current: boolean; date: Date }[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, current: false, date: new Date(year, month - 1, daysInPrev - i) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true, date: new Date(year, month, d) });
  }
  for (let d = 1; cells.length < 42; d++) {
    cells.push({ day: d, current: false, date: new Date(year, month + 1, d) });
  }

  const shiftMonth = (delta: number) => setView(new Date(year, month + delta, 1));

  return (
    <View style={cal.wrap}>
      <View style={cal.header}>
        <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={10} style={cal.navBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={cal.title}>
          {MONTHS[month]} {year}
        </Text>
        <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={10} style={cal.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={cal.weekRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={cal.weekday}>
            {w}
          </Text>
        ))}
      </View>

      <View style={cal.grid}>
        {cells.map((c, i) => {
          const selected = c.current && sameDay(c.date, value);
          const isToday = c.current && sameDay(c.date, today);
          return (
            <TouchableOpacity
              key={i}
              style={cal.cell}
              activeOpacity={0.7}
              onPress={() => onChange(c.date)}
            >
              <View
                style={[
                  cal.dayCircle,
                  isToday && !selected && cal.dayToday,
                  selected && cal.daySelected,
                ]}
              >
                <Text
                  style={[
                    cal.dayText,
                    !c.current && cal.dayMuted,
                    isToday && !selected && cal.dayTodayText,
                    selected && cal.daySelectedText,
                  ]}
                >
                  {c.day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const cal = StyleSheet.create({
  wrap: { paddingBottom: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  title: { ...typography.title, fontSize: 17 },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekday: {
    flex: 1,
    textAlign: 'center',
    ...typography.label,
    color: colors.textTertiary,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: { backgroundColor: colors.primary },
  dayToday: { backgroundColor: colors.primarySoft },
  dayText: { fontSize: 15, color: colors.text, fontWeight: '500' },
  dayMuted: { color: colors.textTertiary, opacity: 0.55 },
  daySelectedText: { color: colors.white, fontWeight: '700' },
  dayTodayText: { color: colors.primary, fontWeight: '700' },
});

/* -------------------------------------------------------------------------- */
/*  Wheel time picker                                                         */
/* -------------------------------------------------------------------------- */

const ITEM_HEIGHT = 44;
const VISIBLE = 5; // odd number so there is a clear centre row
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE;
const PAD = ITEM_HEIGHT * Math.floor(VISIBLE / 2);

/** A single snapping wheel column. */
function WheelColumn({
  items,
  index,
  onChange,
}: {
  items: string[];
  index: number;
  onChange: (i: number) => void;
}) {
  const ref = useRef<ScrollView>(null);
  // Which row currently sits in the centre band (drives styling live).
  const [active, setActive] = useState(index);
  // Last index we reported / positioned to, so we can tell self-driven changes
  // (from scrolling) apart from external ones (mount / opening afresh). Starts
  // at -1 so the first run always positions the column to the initial value.
  const settled = useRef(-1);

  useEffect(() => {
    if (index === settled.current) return; // originated from our own scroll
    settled.current = index;
    setActive(index);
    // Defer a tick so the ScrollView has laid out (esp. inside a sliding modal).
    requestAnimationFrame(() => ref.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false }));
  }, [index]);

  const clamp = (i: number) => Math.max(0, Math.min(items.length - 1, i));

  // Track the centred row on every frame — this is what makes the wheel work
  // with a mouse wheel on web (where momentum/drag-end events never fire).
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = clamp(Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT));
    if (next !== active) setActive(next);
    if (next !== settled.current) {
      settled.current = next;
      onChange(next);
    }
  };

  // Ensure the resting position is snapped exactly to a row (native drag/inertia).
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = clamp(Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT));
    ref.current?.scrollTo({ y: next * ITEM_HEIGHT, animated: true });
  };

  return (
    <ScrollView
      ref={ref}
      style={wheel.col}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScroll={onScroll}
      onMomentumScrollEnd={settle}
      onScrollEndDrag={settle}
      contentContainerStyle={{ paddingVertical: PAD }}
    >
      {items.map((it, i) => {
        const dist = Math.abs(i - active);
        return (
          <View key={it} style={wheel.item}>
            <Text
              style={[
                wheel.itemText,
                i === active ? wheel.itemActive : { opacity: Math.max(0.25, 0.75 - dist * 0.22) },
              ]}
            >
              {it}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const HOURS = Array.from({ length: 12 }, (_, i) => `${i + 1}`);
const MINUTES = Array.from({ length: 12 }, (_, i) => `${i * 5}`.padStart(2, '0'));
const MERIDIEM = ['AM', 'PM'];

/** Parse "10:05 AM" into wheel indices. */
function parseTime(v: string) {
  const m = v.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  const hour = m ? parseInt(m[1], 10) : 9;
  const minute = m ? parseInt(m[2], 10) : 0;
  const mer = m ? m[3].toUpperCase() : 'AM';
  return {
    h: Math.max(0, HOURS.indexOf(`${hour}`)),
    // Snap arbitrary minutes to the nearest 5-minute slot.
    m: Math.max(0, Math.min(MINUTES.length - 1, Math.round(minute / 5))),
    a: mer === 'PM' ? 1 : 0,
  };
}

export function formatTime(h: number, m: number, a: number) {
  return `${HOURS[h]}:${MINUTES[m]} ${MERIDIEM[a]}`;
}

/** iOS-style scroll wheel for picking a time, themed to CampusBook. */
export function TimeWheelPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const init = useMemo(() => parseTime(value), [value]);
  const [h, setH] = useState(init.h);
  const [m, setM] = useState(init.m);
  const [a, setA] = useState(init.a);

  const emit = (nh: number, nm: number, na: number) => onChange(formatTime(nh, nm, na));

  return (
    <View style={wheel.wrap}>
      {/* Centre selection band */}
      <View pointerEvents="none" style={wheel.band} />
      <View style={wheel.row}>
        <WheelColumn
          items={HOURS}
          index={h}
          onChange={(i) => {
            setH(i);
            emit(i, m, a);
          }}
        />
        <Text style={wheel.colon}>:</Text>
        <WheelColumn
          items={MINUTES}
          index={m}
          onChange={(i) => {
            setM(i);
            emit(h, i, a);
          }}
        />
        <WheelColumn
          items={MERIDIEM}
          index={a}
          onChange={(i) => {
            setA(i);
            emit(h, m, i);
          }}
        />
      </View>
    </View>
  );
}

const wheel = StyleSheet.create({
  wrap: { height: WHEEL_HEIGHT, justifyContent: 'center' },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: PAD,
    height: ITEM_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  row: { flexDirection: 'row', height: WHEEL_HEIGHT },
  col: { flex: 1 },
  colon: { fontSize: 22, fontWeight: '700', color: colors.text, alignSelf: 'center' },
  item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontSize: 20, color: colors.text },
  itemActive: { color: colors.primary, fontWeight: '700', opacity: 1 },
});

/* -------------------------------------------------------------------------- */
/*  Tappable field + bottom-sheet host (shared by booking & reschedule)       */
/* -------------------------------------------------------------------------- */

/** Tappable field that opens a picker sheet. */
export function PickerField({
  label,
  value,
  icon,
  flex,
  onPress,
  style,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  flex?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[field.wrap, flex && { flex: 1 }, style]}>
      <Text style={field.label}>{label}</Text>
      <TouchableOpacity style={field.field} activeOpacity={0.7} onPress={onPress}>
        <Text style={field.value}>{value}</Text>
        <Ionicons name={icon} size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

/** Bottom sheet hosting either the calendar or the time wheel, with a Done CTA. */
export function PickerSheet({
  visible,
  mode,
  title,
  date,
  time,
  onDateChange,
  onTimeChange,
  onDone,
  onCancel,
}: {
  visible: boolean;
  mode: 'date' | 'time' | null;
  title: string;
  date: Date;
  time: string;
  onDateChange: (d: Date) => void;
  onTimeChange: (v: string) => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={sheet.backdrop} onPress={onCancel}>
        <Pressable style={sheet.sheet}>
          <View style={sheet.handle} />
          <Text style={sheet.title}>{title}</Text>

          {mode === 'date' ? (
            <CalendarPicker value={date} onChange={onDateChange} />
          ) : mode === 'time' ? (
            <TimeWheelPicker value={time} onChange={onTimeChange} />
          ) : null}

          <Button title="Done" onPress={onDone} style={{ marginTop: spacing.lg }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const field = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { ...typography.label, marginBottom: spacing.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 50,
  },
  value: { fontSize: 15, color: colors.text },
});

const sheet = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...typography.title, marginBottom: spacing.lg },
});
