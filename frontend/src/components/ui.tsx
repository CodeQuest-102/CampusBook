import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, radius, shadow, spacing, typography } from '../theme';
import { noWebOutline } from './webStyle';

/** Section heading with an optional "See all" action, used across dashboards. */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && (
        <TouchableOpacity onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Search bar. When `onPress` is given it behaves as a button (tapping it
 * navigates, e.g. to Browse Rooms) instead of accepting text inline.
 */
export function SearchBar({
  placeholder = 'Search rooms, buildings...',
  onFilter,
  onPress,
  value,
  onChangeText,
}: {
  placeholder?: string;
  onFilter?: () => void;
  onPress?: () => void;
  /** Pass value + onChangeText to make this a live text filter. */
  value?: string;
  onChangeText?: (text: string) => void;
}) {
  return (
    <View style={styles.searchRow}>
      {onPress ? (
        <TouchableOpacity style={styles.search} onPress={onPress} activeOpacity={0.7}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <Text style={[styles.searchInput, { color: colors.textTertiary }]}>{placeholder}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, noWebOutline]}
            value={value}
            onChangeText={onChangeText}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}
      {onFilter && (
        <TouchableOpacity style={styles.filterBtn} onPress={onFilter}>
          <Ionicons name="options-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Small stat tile: count + label with an icon, tinted by tone. */
export function StatTile({
  icon,
  count,
  label,
  tone = 'primary',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  count: number | string;
  label: string;
  tone?: 'primary' | 'pending' | 'approved';
}) {
  const tint =
    tone === 'pending' ? colors.warning : tone === 'approved' ? colors.success : colors.primary;
  const bg =
    tone === 'pending'
      ? colors.warningSoft
      : tone === 'approved'
      ? colors.successSoft
      : colors.primarySoft;

  return (
    <View style={styles.statTile}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Grid tile for a quick action (Browse Rooms, My Bookings, etc.). */
export function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={styles.quickLabel} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** Labelled key/value row for detail screens. */
export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

/** Rounded facility / feature chip. */
export function Chip({ icon, label }: { icon?: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.chip}>
      {icon && <Ionicons name={icon} size={13} color={colors.primary} style={{ marginRight: 4 }} />}
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export const cardStyle: ViewStyle = {
  backgroundColor: colors.card,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.lg,
  ...shadow.card,
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.title },
  sectionAction: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },

  searchRow: { flexDirection: 'row', alignItems: 'center' },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 46,
  },
  searchInput: { flex: 1, marginLeft: spacing.sm, fontSize: fontSize.md, color: colors.text },
  filterBtn: {
    marginLeft: spacing.md,
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...shadow.card,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statCount: { ...typography.h2, fontSize: fontSize.xl },
  statLabel: { ...typography.caption, marginTop: 2 },

  quickAction: { alignItems: 'center', width: '25%', marginBottom: spacing.lg },
  quickIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: fontWeight.medium,
  },

  detailRow: { marginBottom: spacing.lg },
  detailLabel: { ...typography.label, marginBottom: 3 },
  detailValue: { ...typography.body, fontWeight: fontWeight.medium },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipText: { color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});
