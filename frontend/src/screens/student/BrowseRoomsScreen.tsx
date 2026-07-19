import React, { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar, SearchBar, RoomCard, StateView } from '../../components';
import { colors, spacing } from '../../theme';
import { hallsApi, hallToRoom } from '../../api';
import { useApiData } from '../../hooks/useApiData';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BrowseRooms'>;

export default function BrowseRoomsScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const { data, loading, refreshing, error, reload, refresh } = useApiData(async () =>
    (await hallsApi.listHalls()).map(hallToRoom),
  );

  const q = query.trim().toLowerCase();
  const rooms = (data ?? []).filter((r) =>
    !q
      ? true
      : r.building.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.facilities.some((f) => f.toLowerCase().includes(q)),
  );

  return (
    <>
      <TopBar variant="title" title="Browse Rooms" onBack={() => navigation.goBack()} />
      <Screen
        scroll
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        <SearchBar value={query} onChangeText={setQuery} />

        <StateView
          loading={loading}
          error={error}
          onRetry={reload}
          empty={!loading && !error && rooms.length === 0}
          emptyText={q ? 'No rooms match your search.' : 'No rooms available.'}
          emptyIcon="business-outline"
        />

        {!loading && !error && (
          <View style={styles.list}>
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onPress={() => navigation.navigate('RoomDetails', { room })}
              />
            ))}
          </View>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: spacing.lg },
});
