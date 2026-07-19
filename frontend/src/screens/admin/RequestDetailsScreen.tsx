import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar, Avatar, Button, StatusPill, DetailRow, SuccessOverlay } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RequestDetails'>;

export default function RequestDetailsScreen({ route, navigation }: Props) {
  const { request } = route.params;
  const [result, setResult] = useState<'approved' | 'rejected' | null>(null);

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
      </Screen>

      <View style={styles.footer}>
        <Button
          title="Reject"
          variant="danger"
          onPress={() => setResult('rejected')}
          style={styles.footerBtn}
        />
        <View style={{ width: spacing.md }} />
        <Button
          title="Approve"
          variant="success"
          onPress={() => setResult('approved')}
          style={styles.footerBtn}
        />
      </View>

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
  footer: {
    flexDirection: 'row',
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
  },
  footerBtn: { flex: 1 },
});
