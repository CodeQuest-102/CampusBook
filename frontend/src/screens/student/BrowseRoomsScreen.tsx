import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar, SearchBar, RoomCard, StateView } from '../../components';
import { spacing } from '../../theme';
import { hallsApi, hallToRoom } from '../../api';
import { useApiData } from '../../hooks/useApiData';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BrowseRooms'>;

export default function BrowseRoomsScreen({ navigation }: Props) {
  const { data, loading, error, reload } = useApiData(async () =>
    (await hallsApi.listHalls()).map(hallToRoom),
  );

  const rooms = data ?? [];

  return (
    <>
      <TopBar variant="title" title="Browse Rooms" onBack={() => navigation.goBack()} />
      <Screen scroll>
        <SearchBar />

        <StateView
          loading={loading}
          error={error}
          onRetry={reload}
          empty={!loading && !error && rooms.length === 0}
          emptyText="No rooms available."
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
