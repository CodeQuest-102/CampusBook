import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar, Button, StatusPill, Chip } from '../../components';
import { roomStatusLabel, roomTone } from '../../components/StatusPill';
import { colors, radius, spacing, typography } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomDetails'>;

const FACILITY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Projector: 'videocam-outline',
  'A/C': 'snow-outline',
  Whiteboard: 'easel-outline',
  Stage: 'mic-outline',
  'Sound System': 'volume-high-outline',
};

export default function RoomDetailsScreen({ route, navigation }: Props) {
  const { room } = route.params;
  const bookable = room.status !== 'maintenance';
  const [favorite, setFavorite] = useState(false);

  return (
    <>
      <TopBar
        variant="title"
        title="Room Details"
        onBack={() => navigation.goBack()}
        rightIcon={favorite ? 'heart' : 'heart-outline'}
        onRight={() => setFavorite((f) => !f)}
      />
      <Screen scroll>
        <View style={styles.hero}>
          <Ionicons name="business" size={64} color={colors.primary} />
        </View>

        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.building}>{room.building}</Text>
            <Text style={styles.name}>{room.name}</Text>
          </View>
          <StatusPill label={roomStatusLabel(room.status)} tone={roomTone(room.status)} />
        </View>

        <View style={styles.metaGrid}>
          <Meta icon="business-outline" label="Building" value={room.building} />
          <Meta icon="layers-outline" label="Floor" value={room.floor} />
          <Meta icon="people-outline" label="Capacity" value={`${room.capacity}`} />
        </View>

        <Text style={styles.sectionTitle}>Facilities</Text>
        <View style={styles.facilities}>
          {room.facilities.map((f) => (
            <Chip key={f} icon={FACILITY_ICONS[f]} label={f} />
          ))}
        </View>

        <Text style={styles.sectionTitle}>About Room</Text>
        <Text style={styles.about}>{room.description}</Text>
      </Screen>

      <View style={styles.footer}>
        <Button
          title={bookable ? 'Book Now' : 'Unavailable'}
          disabled={!bookable}
          onPress={() => navigation.navigate('BookingForm', { room })}
        />
      </View>
    </>
  );
}

function Meta({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 180,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  building: { ...typography.h3 },
  name: { ...typography.bodyMuted, marginTop: 2 },
  metaGrid: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  meta: { flex: 1, alignItems: 'center' },
  metaLabel: { ...typography.caption, marginTop: 4 },
  metaValue: { ...typography.body, fontWeight: '600', marginTop: 2 },
  sectionTitle: { ...typography.title, marginTop: spacing.xl, marginBottom: spacing.md },
  facilities: { flexDirection: 'row', flexWrap: 'wrap' },
  about: { ...typography.bodyMuted, lineHeight: 22 },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
  },
});
