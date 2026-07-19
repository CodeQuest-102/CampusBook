import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar, TextField, Button } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomForm'>;

const ALL_FACILITIES = ['Projector', 'A/C', 'Whiteboard', 'Stage', 'Sound System'];
const STATUSES: { key: string; label: string }[] = [
  { key: 'available', label: 'Available' },
  { key: 'in_use', label: 'In Use' },
  { key: 'maintenance', label: 'Maintenance' },
];

export default function RoomFormScreen({ route, navigation }: Props) {
  const { mode, room } = route.params;
  const editing = mode === 'edit';

  const [facilities, setFacilities] = useState<string[]>(room?.facilities ?? ['Projector', 'A/C']);
  const [status, setStatus] = useState<string>(room?.status ?? 'available');

  const toggle = (f: string) =>
    setFacilities((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  return (
    <>
      <TopBar
        variant="title"
        title={editing ? 'Edit Room' : 'Add Room'}
        onBack={() => navigation.goBack()}
      />
      <Screen scroll>
        <TextField label="Building" placeholder="Engineering Block A" defaultValue={room?.building} />
        <TextField label="Room Name" placeholder="Lecture Room A101" defaultValue={room?.name} />
        <View style={styles.row}>
          <TextField
            label="Floor"
            placeholder="1st Floor"
            defaultValue={room?.floor}
            containerStyle={styles.flex}
          />
          <View style={{ width: spacing.md }} />
          <TextField
            label="Capacity"
            placeholder="120"
            keyboardType="number-pad"
            defaultValue={room ? String(room.capacity) : undefined}
            containerStyle={styles.flex}
          />
        </View>

        <Text style={styles.label}>Facilities</Text>
        <View style={styles.chips}>
          {ALL_FACILITIES.map((f) => {
            const on = facilities.includes(f);
            return (
              <TouchableOpacity
                key={f}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => toggle(f)}
                activeOpacity={0.8}
              >
                {on && <Ionicons name="checkmark" size={14} color={colors.white} style={{ marginRight: 4 }} />}
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Status</Text>
        <View style={styles.chips}>
          {STATUSES.map((s) => {
            const on = status === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => setStatus(s.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Screen>

      <View style={styles.footer}>
        <Button
          title={editing ? 'Save Changes' : 'Add Room'}
          icon={editing ? 'save-outline' : 'add'}
          onPress={() => navigation.goBack()}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  flex: { flex: 1 },
  label: { ...typography.label, marginBottom: spacing.md, marginTop: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  chipTextOn: { color: colors.white },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
  },
});
