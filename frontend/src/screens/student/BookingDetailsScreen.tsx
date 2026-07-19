import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Screen,
  TopBar,
  Button,
  StatusPill,
  DetailRow,
  PickerField,
  PickerSheet,
  SuccessOverlay,
  formatDate,
  parseDate,
} from '../../components';
import { bookingTone } from '../../components/StatusPill';
import { colors, radius, spacing, typography } from '../../theme';
import { bookingsApi, ApiError } from '../../api';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BookingDetails'>;
type PickerKind = 'date' | 'start' | 'end';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function BookingDetailsScreen({ route, navigation }: Props) {
  const { booking } = route.params;
  const cancellable = booking.status === 'approved' || booking.status === 'pending';

  // Editable schedule (seeded from the booking) so a reschedule reflects live.
  const [date, setDate] = useState(() => parseDate(booking.date));
  const [start, setStart] = useState(booking.startTime);
  const [end, setEnd] = useState(booking.endTime);

  const [editing, setEditing] = useState(false);
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const [draftDate, setDraftDate] = useState(date);
  const [draftTime, setDraftTime] = useState(start);
  const [rescheduled, setRescheduled] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const cancelBooking = () => {
    Alert.alert('Cancel booking', 'Are you sure you want to cancel this booking?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Booking',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await bookingsApi.cancelBooking(booking.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert(
              'Could not cancel',
              e instanceof ApiError ? e.message : 'Please try again.',
            );
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

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

  return (
    <>
      <TopBar variant="title" title="Booking Details" onBack={() => navigation.goBack()} />
      <Screen scroll>
        <View style={styles.statusRow}>
          <StatusPill label={cap(booking.status)} tone={bookingTone(booking.status)} />
        </View>

        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.thumb}>
              <Ionicons name="business" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.room}>{booking.building}</Text>
              <Text style={styles.roomMeta}>{booking.roomName}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <DetailRow label="Date & Time" value={`${formatDate(date)} · ${start} — ${end}`} />
          <DetailRow label="Purpose / Event Title" value={booking.purpose} />
          <DetailRow label="Status" value={cap(booking.status)} />
        </View>

        {editing && (
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>Reschedule</Text>
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
            <Button
              title="Confirm New Time"
              icon="checkmark"
              onPress={() => {
                setEditing(false);
                setRescheduled(true);
              }}
            />
            <Button
              title="Discard"
              variant="ghost"
              onPress={() => setEditing(false)}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        )}

        {cancellable && !editing && (
          <>
            <Button
              title="Reschedule"
              variant="secondary"
              icon="calendar-outline"
              onPress={() => setEditing(true)}
              style={{ marginTop: spacing.xl }}
            />
            <Button
              title="Cancel Booking"
              variant="danger"
              loading={cancelling}
              onPress={cancelBooking}
              style={{ marginTop: spacing.md }}
            />
          </>
        )}
      </Screen>

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

      <SuccessOverlay
        visible={rescheduled}
        title="Booking Rescheduled"
        subtitle={`Now ${formatDate(date)} · ${start} — ${end}`}
        onDone={() => setRescheduled(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  statusRow: { marginTop: spacing.md, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  room: { ...typography.title, fontSize: 15 },
  roomMeta: { ...typography.caption, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.lg },
  editCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  editTitle: { ...typography.title, fontSize: 15, marginBottom: spacing.md },
  timeRow: { flexDirection: 'row' },
});
