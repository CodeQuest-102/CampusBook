import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar, SearchBar, RoomCard } from '../../components';
import { colors, fontWeight, radius, spacing } from '../../theme';
import { rooms } from '../../data/placeholder';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BrowseRooms'>;

const FILTERS = ['All', 'My Building', 'Filters'];

export default function BrowseRoomsScreen({ navigation }: Props) {
  const [active, setActive] = useState('All');

  return (
    <>
      <TopBar variant="title" title="Browse Rooms" onBack={() => navigation.goBack()} />
      <Screen scroll>
        <SearchBar />

        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const on = active === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filter, on && styles.filterActive]}
                onPress={() => setActive(f)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, on && styles.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.list}>
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onPress={() => navigation.navigate('RoomDetails', { room })}
            />
          ))}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', marginTop: spacing.lg, marginBottom: spacing.md },
  filter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textSecondary, fontWeight: fontWeight.medium, fontSize: 13 },
  filterTextActive: { color: colors.white },
  list: { marginTop: spacing.sm },
});
