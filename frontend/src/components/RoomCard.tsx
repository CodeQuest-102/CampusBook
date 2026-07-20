import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, radius, shadow, spacing, typography } from '../theme';
import StatusPill, { roomStatusLabel, roomTone } from './StatusPill';
import { Room } from '../data/placeholder';

interface Props {
  room: Room;
  onPress?: () => void;
  /** Compact variant used in admin room-management lists (thumbnail on left). */
  variant?: 'default' | 'list';
}

export default function RoomCard({ room, onPress, variant = 'default' }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.card}>
      <View style={styles.thumb}>
        <Ionicons name="business-outline" size={variant === 'list' ? 24 : 28} color={colors.primary} />
      </View>

      <View style={styles.body}>
        <Text style={styles.building} numberOfLines={1}>
          {room.building}
        </Text>
        <Text style={styles.name} numberOfLines={1}>
          {room.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          Capacity: {room.capacity} · {room.floor}
        </Text>
      </View>

      <StatusPill
        label={roomStatusLabel(room.status)}
        tone={roomTone(room.status)}
        style={styles.pill}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  body: { flex: 1 },
  building: { ...typography.title, fontSize: fontSize.md },
  name: { ...typography.bodyMuted, fontSize: fontSize.sm, marginTop: 1 },
  meta: { ...typography.caption, marginTop: 2 },
  pill: { marginLeft: spacing.sm },
});
