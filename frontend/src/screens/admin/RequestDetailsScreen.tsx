import React, { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Screen,
  TopBar,
  Avatar,
  Button,
  TextField,
  StatusPill,
  DetailRow,
  SuccessOverlay,
  BookingHistory,
} from '../../components';
import { colors, fontWeight, radius, spacing, typography } from '../../theme';
import { bookingsApi, formatDisplayTime, ApiError } from '../../api';
import { useApiData } from '../../hooks/useApiData';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RequestDetails'>;

export default function RequestDetailsScreen({ route, navigation }: Props) {
  const { request } = route.params;
  const [result, setResult] = useState<'approved' | 'rejected' | null>(null);
  const [busy, setBusy] = useState(false);

  // Open with a reason when rejecting because approval hit a clash, so the
  // requester is told why rather than just seeing their request disappear.
  const [rejectPrompt, setRejectPrompt] = useState<{ reason: string } | null>(null);

  // Approved + pending bookings competing for this slot. A failure here is not
  // worth an error state on the whole screen — the decision buttons still work,
  // and approval remains the backstop that actually enforces the clash.
  const { data: conflicts } = useApiData(() => bookingsApi.conflicts(request.id));
  const clashes = conflicts ?? [];

  const reject = async (reason?: string) => {
    setBusy(true);
    try {
      await bookingsApi.rejectBooking(request.id, reason?.trim() || undefined);
      setRejectPrompt(null);
      setResult('rejected');
    } catch (e) {
      Alert.alert('Could not reject', e instanceof ApiError ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    setBusy(true);
    try {
      await bookingsApi.approveBooking(request.id);
      setResult('approved');
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Please try again.';
      // The usual cause is that the slot went to someone else. Offer the way
      // out directly: reject this one and tell the requester why.
      Alert.alert('Could not approve', message, [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Reject & notify',
          style: 'destructive',
          onPress: () => setRejectPrompt({ reason: message }),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar variant="title" title="Request Details" onBack={() => navigation.goBack()} />
      <Screen scroll>
        <View style={styles.statusRow}>
          <StatusPill label="Pending" tone="pending" />
        </View>

        <View style={styles.requester}>
          <Avatar name={request.requesterName} size={48} color={request.avatarColor} />
          <View style={{ marginLeft: spacing.md, flex: 1 }}>
            <Text style={styles.name}>{request.requesterName}</Text>
            <Text style={styles.role}>
              {request.requesterRole} · {request.requesterDept}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <DetailRow label="Room" value={`${request.building}\n${request.roomName}`} />
          <DetailRow label="Date & Time" value={`${request.date} · ${request.startTime} — ${request.endTime}`} />
          <DetailRow label="Purpose / Event Title" value={request.purpose} />
          {request.attendance != null && (
            <DetailRow label="Expected Attendance" value={`${request.attendance}`} />
          )}
          {request.notes && <DetailRow label="Additional Notes" value={request.notes} />}
        </View>

        {clashes.length > 0 && (
          <View style={styles.clash}>
            <View style={styles.clashHeader}>
              <Ionicons name="warning-outline" size={18} color={colors.warning} />
              <Text style={styles.clashTitle}>
                Overlaps {clashes.length} other {clashes.length === 1 ? 'booking' : 'bookings'}
              </Text>
            </View>
            {clashes.map((c) => (
              <Text key={c.id} style={styles.clashRow}>
                {c.status === 'APPROVED' ? 'Approved' : 'Pending'} · {c.userFullName} ·{' '}
                {formatDisplayTime(c.startTime)} — {formatDisplayTime(c.endTime)}
              </Text>
            ))}
            <Text style={styles.clashNote}>
              Approving this request will fail while an approved booking holds the slot.
            </Text>
          </View>
        )}

        <BookingHistory bookingId={request.id} />
      </Screen>

      <View style={styles.footer}>
        <Button
          title="Reject"
          variant="danger"
          loading={busy}
          onPress={() => setRejectPrompt({ reason: '' })}
          style={styles.footerBtn}
        />
        <View style={{ width: spacing.md }} />
        <Button
          title="Approve"
          variant="success"
          loading={busy}
          onPress={approve}
          style={styles.footerBtn}
        />
      </View>

      <RejectSheet
        prompt={rejectPrompt}
        busy={busy}
        requesterName={request.requesterName}
        onChange={(reason) => setRejectPrompt({ reason })}
        onCancel={() => setRejectPrompt(null)}
        onConfirm={reject}
      />

      <SuccessOverlay
        visible={result !== null}
        tone={result === 'rejected' ? 'danger' : 'success'}
        title={result === 'rejected' ? 'Request Rejected' : 'Request Approved'}
        subtitle={`${request.requesterName} will be notified.`}
        onDone={() => {
          setResult(null);
          navigation.goBack();
        }}
      />
    </>
  );
}

/**
 * Reason box shown before a rejection goes out. The reason rides along on the
 * rejection notification, so "no reason given" is a worse outcome than a slow
 * one — but it stays optional, since a bad request is sometimes just a bad
 * request.
 */
function RejectSheet({
  prompt,
  busy,
  requesterName,
  onChange,
  onCancel,
  onConfirm,
}: {
  prompt: { reason: string } | null;
  busy: boolean;
  requesterName: string;
  onChange: (reason: string) => void;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  return (
    <Modal visible={prompt !== null} transparent animationType="slide" onRequestClose={onCancel}>
      {/* Dismiss target sits above the sheet rather than wrapping it — a
          Pressable ancestor would swallow drags aimed at the input. */}
      <View style={sheet.backdrop}>
        <Pressable style={sheet.dismissArea} onPress={onCancel} />
        <View style={sheet.sheet}>
          <View style={sheet.handle} />
          <Text style={sheet.title}>Reject request</Text>
          <Text style={sheet.subtitle}>
            {requesterName} will be notified. A reason helps them rebook.
          </Text>

          <TextField
            label="Reason (optional)"
            placeholder="e.g. the hall is already booked for that slot"
            multiline
            numberOfLines={3}
            value={prompt?.reason ?? ''}
            onChangeText={onChange}
          />

          <Button
            title="Reject & notify"
            variant="danger"
            loading={busy}
            onPress={() => onConfirm(prompt?.reason ?? '')}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  statusRow: { marginTop: spacing.md, alignItems: 'flex-end' },
  requester: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  name: { ...typography.title, fontSize: 16 },
  role: { ...typography.bodyMuted, fontSize: 13, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  clash: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  clashHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  clashTitle: {
    ...typography.title,
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  clashRow: { ...typography.caption, color: colors.text, marginTop: 2 },
  clashNote: { ...typography.caption, marginTop: spacing.sm, fontStyle: 'italic' },
  footer: {
    flexDirection: 'row',
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
  },
  footerBtn: { flex: 1 },
});

const sheet = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
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
  title: { ...typography.title },
  subtitle: { ...typography.bodyMuted, fontSize: 13, marginTop: 4, marginBottom: spacing.lg },
});
