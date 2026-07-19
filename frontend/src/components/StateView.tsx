import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontWeight, spacing, typography } from '../theme';

interface Props {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Show an empty-state message when there's no data and no error/loading. */
  empty?: boolean;
  emptyText?: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
}

/**
 * Shared loading / error / empty presentation for data-backed screens.
 * Renders `null` when there is nothing to show (i.e. data is ready).
 */
export default function StateView({
  loading,
  error,
  onRetry,
  empty,
  emptyText = 'Nothing here yet.',
  emptyIcon = 'file-tray-outline',
}: Props) {
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.textTertiary} />
        <Text style={styles.errorText}>{error}</Text>
        {onRetry && (
          <TouchableOpacity style={styles.retry} onPress={onRetry} activeOpacity={0.8}>
            <Ionicons name="refresh" size={16} color={colors.white} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (empty) {
    return (
      <View style={styles.container}>
        <Ionicons name={emptyIcon} size={40} color={colors.textTertiary} />
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.huge },
  errorText: {
    ...typography.bodyMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyText: { ...typography.bodyMuted, textAlign: 'center', marginTop: spacing.md },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.lg,
  },
  retryText: { color: colors.white, fontWeight: fontWeight.semibold, marginLeft: 6, fontSize: 13 },
});
