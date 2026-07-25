import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar, TextField, Button, KeyboardAvoider } from '../../components';
import { colors, fontWeight, radius, spacing, typography } from '../../theme';
import { hallsApi, ApiError } from '../../api';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomForm'>;

// These three map directly to the backend Hall boolean flags.
const ALL_FACILITIES = ['Projector', 'A/C', 'Microphone'];
const STATUSES: { key: string; label: string }[] = [
  { key: 'available', label: 'Available' },
  { key: 'maintenance', label: 'Maintenance' },
];

export default function RoomFormScreen({ route, navigation }: Props) {
  const { mode, room } = route.params;
  const editing = mode === 'edit';

  const [building, setBuilding] = useState(room?.building ?? '');
  const [roomCode, setRoomCode] = useState((room?.name ?? '').replace(/^Room\s+/i, ''));
  const [capacity, setCapacity] = useState(room ? String(room.capacity) : '');
  const [facilities, setFacilities] = useState<string[]>(room?.facilities ?? ['Projector', 'A/C']);
  const [status, setStatus] = useState<string>(
    room ? (room.status === 'maintenance' ? 'maintenance' : 'available') : 'available',
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    building?: string | null;
    roomCode?: string | null;
    capacity?: string | null;
  }>({});

  const toggle = (f: string) =>
    setFacilities((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  const save = async () => {
    const seats = Number(capacity.trim());
    // Inline per-field errors rather than an Alert — the user can see which box
    // to fix. Alerts stay for the plan-limit prompt below, which offers an action.
    const nextErrors = {
      building: building.trim() ? null : 'Building is required.',
      roomCode: roomCode.trim() ? null : 'Room code is required.',
      capacity: !capacity.trim()
        ? 'Capacity is required.'
        : !Number.isInteger(seats) || seats <= 0
        ? 'Capacity must be a whole number above zero.'
        : null,
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const payload = {
      block: building.trim(),
      roomCode: roomCode.trim(),
      capacity: Number(capacity),
      hasProjector: facilities.includes('Projector'),
      hasAC: facilities.includes('A/C'),
      hasMicrophone: facilities.includes('Microphone'),
      active: status !== 'maintenance',
    };
    setSaving(true);
    try {
      if (editing && room) await hallsApi.updateHall(room.id, payload);
      else await hallsApi.createHall(payload);
      navigation.goBack();
    } catch (e) {
      // 402 = plan room limit reached — offer an upgrade path.
      if (e instanceof ApiError && e.status === 402) {
        Alert.alert('Room limit reached', e.message, [
          { text: 'Not now', style: 'cancel' },
          { text: 'View Plans', onPress: () => navigation.navigate('Subscription') },
        ]);
      } else {
        Alert.alert('Could not save', e instanceof ApiError ? e.message : 'Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoider>
      <TopBar
        variant="title"
        title={editing ? 'Edit Room' : 'Add Room'}
        onBack={() => navigation.goBack()}
      />
      <Screen scroll>
        <TextField
          label="Building / Block"
          placeholder="Science Complex Block"
          error={errors.building}
          value={building}
          onChangeText={(t) => {
            setBuilding(t);
            if (errors.building) setErrors((e) => ({ ...e, building: null }));
          }}
        />
        <View style={styles.row}>
          <TextField
            label="Room Code"
            placeholder="GF1"
            autoCapitalize="characters"
            error={errors.roomCode}
            value={roomCode}
            onChangeText={(t) => {
              setRoomCode(t);
              if (errors.roomCode) setErrors((e) => ({ ...e, roomCode: null }));
            }}
            containerStyle={styles.flex}
          />
          <View style={{ width: spacing.md }} />
          <TextField
            label="Capacity"
            placeholder="120"
            keyboardType="number-pad"
            error={errors.capacity}
            value={capacity}
            onChangeText={(t) => {
              setCapacity(t);
              if (errors.capacity) setErrors((e) => ({ ...e, capacity: null }));
            }}
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
          loading={saving}
          onPress={save}
        />
      </View>
    </KeyboardAvoider>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  flex: { flex: 1 },
  label: { ...typography.label, marginBottom: spacing.md, marginTop: spacing.xs, fontWeight: fontWeight.semibold },
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
