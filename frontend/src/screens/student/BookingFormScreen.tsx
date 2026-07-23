import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar, TextField, Button, StatusPill, PickerField, PickerSheet, formatDate, KeyboardAvoider, RoomAvailability } from '../../components';
import { colors, fontWeight, radius, spacing, typography } from '../../theme';
import { bookingsApi, toLocalDateTimeIso, toLocalDateString, ApiError } from '../../api';
import { NOTES_MAX_LENGTH, PURPOSE_MAX_LENGTH, validateAttendance } from '../../validation';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BookingForm'>;

type PickerKind = 'date' | 'start' | 'end' | 'until';

/** Default to tomorrow — the backend rejects bookings that start in the past. */
function tomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function BookingFormScreen({ route, navigation }: Props) {
  const { room } = route.params;

  const [date, setDate] = useState(tomorrow);
  const [start, setStart] = useState('10:00 AM');
  const [end, setEnd] = useState('12:00 PM');
  const [purpose, setPurpose] = useState('');
  const [attendance, setAttendance] = useState('');
  const [notes, setNotes] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [until, setUntil] = useState(() => {
    const d = tomorrow();
    d.setDate(d.getDate() + 28); // default: 4 weekly occurrences
    return d;
  });
  const [picker, setPicker] = useState<PickerKind | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  // Draft values so the sheet can be confirmed with "Done" or dismissed to cancel.
  const [draftDate, setDraftDate] = useState(date);
  const [draftTime, setDraftTime] = useState('10:00 AM');

  const openPicker = (kind: PickerKind) => {
    if (kind === 'date') setDraftDate(date);
    else if (kind === 'until') setDraftDate(until);
    else setDraftTime(kind === 'start' ? start : end);
    setPicker(kind);
  };

  const confirmPicker = () => {
    if (picker === 'date') setDate(draftDate);
    else if (picker === 'until') setUntil(draftDate);
    else if (picker === 'start') setStart(draftTime);
    else if (picker === 'end') setEnd(draftTime);
    setPicker(null);
  };

  const sheetTitle =
    picker === 'date'
      ? 'Select Date'
      : picker === 'until'
      ? 'Repeat Until'
      : picker === 'start'
      ? 'Select Start Time'
      : 'Select End Time';

  const submit = async () => {
    if (!purpose.trim()) {
      setFormError('Please enter a purpose / event title.');
      return;
    }
    if (repeat && until <= date) {
      setFormError('The repeat-until date must be after the first booking date.');
      return;
    }
    // The room's capacity is already on screen just above this field.
    const attendanceProblem = validateAttendance(attendance, room.capacity);
    if (attendanceProblem) {
      setFormError(null);
      setAttendanceError(attendanceProblem);
      return;
    }
    setFormError(null);
    setAttendanceError(null);
    setSubmitting(true);
    const parsedAttendance = parseInt(attendance, 10);
    const attendanceValue = Number.isNaN(parsedAttendance) ? undefined : parsedAttendance;
    try {
      if (repeat) {
        const result = await bookingsApi.createRecurring({
          hallId: Number(room.id),
          purpose: purpose.trim(),
          notes: notes.trim() || undefined,
          attendance: attendanceValue,
          startTime: toLocalDateTimeIso(date, start),
          endTime: toLocalDateTimeIso(date, end),
          until: toLocalDateString(until),
        });
        const skipped = result.skipped.length;
        Alert.alert(
          'Recurring booking submitted',
          `${result.created.length} weekly slot${result.created.length === 1 ? '' : 's'} requested` +
            (skipped ? `, ${skipped} skipped (conflicts or limits).` : '.'),
          [{ text: 'OK', onPress: () => navigation.replace('Main', { screen: 'Bookings' }) }],
        );
      } else {
        await bookingsApi.createBooking({
          hallId: Number(room.id),
          purpose: purpose.trim(),
          notes: notes.trim() || undefined,
          attendance: attendanceValue,
          startTime: toLocalDateTimeIso(date, start),
          endTime: toLocalDateTimeIso(date, end),
        });
        navigation.replace('BookingConfirmation', {
          room,
          dateLabel: formatDate(date),
          timeLabel: `${start} — ${end}`,
          purpose: purpose.trim(),
        });
      }
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Could not submit your request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoider>
      <TopBar variant="title" title="New Booking" onBack={() => navigation.goBack()} />
      <Screen scroll>
        <Text style={styles.groupLabel}>Room</Text>
        <View style={styles.roomCard}>
          <View style={styles.roomThumb}>
            <Ionicons name="business" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.roomName}>{room.building}</Text>
            <Text style={styles.roomMeta}>
              {room.name} · Capacity: {room.capacity}
            </Text>
          </View>
          <StatusPill label="Available" tone="available" />
        </View>

        <PickerField
          label="Date"
          value={formatDate(date)}
          icon="calendar-outline"
          onPress={() => openPicker('date')}
        />
        <View style={styles.timeRow}>
          <PickerField
            label="Start Time"
            value={start}
            icon="time-outline"
            flex
            onPress={() => openPicker('start')}
          />
          <View style={{ width: spacing.md }} />
          <PickerField
            label="End Time"
            value={end}
            icon="time-outline"
            flex
            onPress={() => openPicker('end')}
          />
        </View>

        <Text style={styles.groupLabel}>Already booked on {formatDate(date)}</Text>
        <View style={{ marginBottom: spacing.lg }}>
          <RoomAvailability roomId={room.id} date={date} />
        </View>

        <TextField
          label="Purpose / Event Title"
          placeholder="Department Meeting"
          maxLength={PURPOSE_MAX_LENGTH}
          value={purpose}
          onChangeText={setPurpose}
        />
        <TextField
          label="Expected Attendance"
          placeholder="80"
          keyboardType="number-pad"
          helper={`This room seats ${room.capacity}`}
          error={attendanceError}
          value={attendance}
          onChangeText={(t) => {
            setAttendance(t);
            if (attendanceError) setAttendanceError(null);
          }}
        />
        <TextField
          label="Additional Notes (Optional)"
          placeholder="Any other notes..."
          multiline
          numberOfLines={3}
          maxLength={NOTES_MAX_LENGTH}
          value={notes}
          onChangeText={setNotes}
          containerStyle={{ marginBottom: spacing.sm }}
        />

        <TouchableOpacity
          style={styles.repeatRow}
          activeOpacity={0.8}
          onPress={() => setRepeat((r) => !r)}
        >
          <View style={[styles.checkbox, repeat && styles.checkboxOn]}>
            {repeat && <Ionicons name="checkmark" size={14} color={colors.white} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.repeatTitle}>Repeat weekly</Text>
            <Text style={styles.repeatSub}>Book this slot every week until a chosen date</Text>
          </View>
        </TouchableOpacity>

        {repeat && (
          <PickerField
            label="Repeat until"
            value={formatDate(until)}
            icon="repeat-outline"
            onPress={() => openPicker('until')}
          />
        )}

        {formError && <Text style={styles.error}>{formError}</Text>}
      </Screen>

      <View style={styles.footer}>
        <Button title="Submit Request" onPress={submit} loading={submitting} />
      </View>

      <PickerSheet
        visible={picker !== null}
        mode={picker === 'date' || picker === 'until' ? 'date' : picker ? 'time' : null}
        title={sheetTitle}
        date={draftDate}
        time={draftTime}
        onDateChange={setDraftDate}
        onTimeChange={setDraftTime}
        onDone={confirmPicker}
        onCancel={() => setPicker(null)}
      />
    </KeyboardAvoider>
  );
}

const styles = StyleSheet.create({
  groupLabel: { ...typography.label, marginTop: spacing.md, marginBottom: spacing.sm },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  roomThumb: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  roomName: { ...typography.title, fontSize: 15 },
  roomMeta: { ...typography.caption, marginTop: 2 },
  timeRow: { flexDirection: 'row' },
  repeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  repeatTitle: { ...typography.body, fontWeight: fontWeight.semibold },
  repeatSub: { ...typography.caption, marginTop: 1 },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: spacing.md,
    fontWeight: fontWeight.medium,
  },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
  },
});
