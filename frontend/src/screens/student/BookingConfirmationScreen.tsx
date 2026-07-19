import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, Button } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BookingConfirmation'>;

export default function BookingConfirmationScreen({ route, navigation }: Props) {
  const { room } = route.params;

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.top}>
        <View style={styles.check}>
          <Ionicons name="checkmark" size={48} color={colors.white} />
        </View>
        <Text style={styles.title}>Booking Request Submitted!</Text>
        <Text style={styles.subtitle}>Your booking request has been submitted successfully.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.thumb}>
            <Ionicons name="business" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.room}>{room.building}</Text>
            <Text style={styles.roomMeta}>{room.name}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <Row icon="calendar-outline" text="15 May 2026" />
        <Row icon="time-outline" text="10:00 AM — 12:00 PM" />
        <Row icon="document-text-outline" text="Department Meeting" />
      </View>

      <Text style={styles.note}>
        You will be notified once an administrator reviews your request.
      </Text>

      <Button
        title="View My Bookings"
        onPress={() => navigation.replace('Main', { screen: 'Bookings' })}
        style={{ marginTop: spacing.xl }}
      />
      <Button
        title="Back to Home"
        variant="ghost"
        onPress={() => navigation.replace('Main', { screen: 'Home' })}
      />
    </Screen>
  );
}

function Row({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} />
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', marginTop: spacing.huge, marginBottom: spacing.xl },
  check: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: { ...typography.h2, textAlign: 'center' },
  subtitle: {
    ...typography.bodyMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
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
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  rowText: { marginLeft: spacing.sm, color: colors.textSecondary, fontSize: 14 },
  note: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },
});
