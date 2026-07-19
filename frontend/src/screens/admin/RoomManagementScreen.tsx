import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar, StatusPill } from '../../components';
import { roomStatusLabel, roomTone } from '../../components/StatusPill';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import { rooms as seedRooms, Room } from '../../data/placeholder';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomManagement'>;

export default function RoomManagementScreen({ navigation }: Props) {
  const [rooms, setRooms] = useState<Room[]>(seedRooms);

  const confirmDelete = (room: Room) => {
    Alert.alert('Delete room', `Remove ${room.building} — ${room.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setRooms((cur) => cur.filter((r) => r.id !== room.id)),
      },
    ]);
  };

  return (
    <>
      <TopBar variant="title" title="Room Management" onBack={() => navigation.goBack()} />
      <Screen scroll>
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Rooms</Text>
          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('RoomForm', { mode: 'add' })}
          >
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={styles.addText}>Add Room</Text>
          </TouchableOpacity>
        </View>

        {rooms.map((room) => (
          <TouchableOpacity
            key={room.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('RoomDetails', { room })}
          >
            <View style={styles.thumb}>
              <Ionicons name="business" size={22} color={colors.primary} />
            </View>
            <View style={styles.info}>
              <Text style={styles.building}>{room.building}</Text>
              <Text style={styles.name}>{room.name}</Text>
              <Text style={styles.meta}>
                Capacity: {room.capacity} · {room.floor}
              </Text>
            </View>
            <View style={styles.right}>
              <StatusPill label={roomStatusLabel(room.status)} tone={roomTone(room.status)} />
              <View style={styles.actions}>
                <TouchableOpacity
                  hitSlop={8}
                  onPress={() => navigation.navigate('RoomForm', { mode: 'edit', room })}
                >
                  <Ionicons name="create-outline" size={19} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity hitSlop={8} onPress={() => confirmDelete(room)} style={{ marginLeft: spacing.md }}>
                  <Ionicons name="trash-outline" size={19} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  heading: { ...typography.h3 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  addText: { color: colors.white, fontWeight: '600', marginLeft: 4, fontSize: 13 },
  card: {
    flexDirection: 'row',
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
  info: { flex: 1, justifyContent: 'center' },
  building: { ...typography.title, fontSize: 15 },
  name: { ...typography.bodyMuted, fontSize: 13, marginTop: 1 },
  meta: { ...typography.caption, marginTop: 2 },
  right: { alignItems: 'flex-end', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', marginTop: spacing.md },
});
