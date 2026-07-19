import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fontSize, fontWeight, radius, spacing } from '../theme';

export type PillTone = 'available' | 'pending' | 'rejected' | 'maintenance' | 'neutral';

interface Props {
  label: string;
  tone: PillTone;
  style?: ViewStyle;
}

const TONES: Record<PillTone, { bg: string; fg: string }> = {
  available: { bg: colors.successSoft, fg: colors.success },
  pending: { bg: colors.warningSoft, fg: colors.warning },
  rejected: { bg: colors.dangerSoft, fg: colors.danger },
  maintenance: { bg: colors.maintenanceSoft, fg: colors.maintenance },
  neutral: { bg: colors.cardAlt, fg: colors.textSecondary },
};

/** Small rounded status label — green/amber/red/orange per the design system. */
export default function StatusPill({ label, tone, style }: Props) {
  const { bg, fg } = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** Convenience mappers so screens don't repeat status→tone/label logic. */
export function bookingTone(status: string): PillTone {
  switch (status) {
    case 'approved':
      return 'available';
    case 'pending':
      return 'pending';
    case 'rejected':
    case 'cancelled':
      return 'rejected';
    default:
      return 'neutral';
  }
}

export function roomTone(status: string): PillTone {
  switch (status) {
    case 'available':
      return 'available';
    case 'in_use':
      return 'pending';
    case 'maintenance':
      return 'maintenance';
    default:
      return 'neutral';
  }
}

export function roomStatusLabel(status: string): string {
  switch (status) {
    case 'available':
      return 'Available';
    case 'in_use':
      return 'In Use';
    case 'maintenance':
      return 'Maintenance';
    default:
      return status;
  }
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
  },
});
