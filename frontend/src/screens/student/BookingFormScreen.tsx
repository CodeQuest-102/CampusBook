import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Screen,
  TopBar,
  TextField,
  Button,
  StatusPill,
  PickerField,
  PickerSheet,
  formatDate,
} from '../../components';
import { colors, fontWeight, radius, spacing, typography } from '../../theme';
import { bookingsApi, toLocalDateTimeIso, ApiError } from '../../api';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BookingForm'>;

type PickerKind = 'date' | 'start' | 'end';

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
  const [picker, setPicker] = useState<PickerKind | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Draft values so the sheet can be confirmed with "Done" or dismissed to cancel.
  const [draftDate, setDraftDate] = useState(date);
  const [draftTime, setDraftTime] = useState('10:00 AM');

  const openPicker = (kind: PickerKind) => {
    if (kind === 'date') setDraftDate(date);
    else setDraftTime(kind === 'start' ? start : end);
    setPicker(kind);
  };

  const confirmPicker = () => {
    if (picker === 'date') setDate(draftDate);
    else if (picker === 'start') setStart(draftTime);
    else if (picker === 'end') setEnd(draftTime);
    setPicker(null);
  };

  const sheetTitle =
    picker === 'date' ? 'Select Date' : picker === 'start' ? 'Select Start Time' : 'Select End Time';

  const submit = async () => {
    if (!purpose.trim()) {
      setFormError('Please enter a purpose / event title.');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const parsedAttendance = parseInt(attendance, 10);
      await bookingsApi.createBooking({
        hallId: Number(room.id),
        purpose: purpose.trim(),
        notes: notes.trim() || undefined,
        attendance: Number.isNaN(parsedAttendance) ? undefined : parsedAttendance,
        startTime: toLocalDateTimeIso(date, start),
        endTime: toLocalDateTimeIso(date, end),
      });
      navigation.replace('BookingConfirmation', {
        room,
        dateLabel: formatDate(date),
        timeLabel: `${start} — ${end}`,
        purpose: purpose.trim(),
      });
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Could not submit your request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
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

        <TextField
          label="Purpose / Event Title"
          placeholder="Department Meeting"
          value={purpose}
          onChangeText={setPurpose}
        />
        <TextField
          label="Expected Attendance"
          placeholder="80"
          keyboardType="number-pad"
          value={attendance}
          onChangeText={setAttendance}
        />
        <TextField
          label="Additional Notes (Optional)"
          placeholder="Any other notes..."
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
          containerStyle={{ marginBottom: spacing.sm }}
        />

        {formError && <Text style={styles.error}>{formError}</Text>}
      </Screen>

      <View style={styles.footer}>
        <Button title="Submit Request" onPress={submit} loading={submitting} />
      </View>

      <PickerSheet
        visible={picker !== null}
        mode={picker === 'date' ? 'date' : picker ? 'time' : null}
        title={sheetTitle}
        date={draftDate}
        time={draftTime}
        onDateChange={setDraftDate}
        onTimeChange={setDraftTime}
        onDone={confirmPicker}
        onCancel={() => setPicker(null)}
      />
    </>
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
