import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar, BookingCard, StateView } from '../../components';
import { bookingsApi, bookingToUi } from '../../api';
import { useApiData } from '../../hooks/useApiData';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MyRequests'>;

/** The user's submitted booking requests (pending items first). */
export default function MyRequestsScreen({ navigation }: Props) {
  const { data, loading, error, reload } = useApiData(async () =>
    (await bookingsApi.myBookings()).map(bookingToUi),
  );

  const requests = (data ?? []).filter((b) => b.status === 'pending' || b.status === 'rejected');

  return (
    <>
      <TopBar variant="title" title="My Requests" onBack={() => navigation.goBack()} />
      <Screen scroll>
        <StateView
          loading={loading}
          error={error}
          onRetry={reload}
          empty={!loading && !error && requests.length === 0}
          emptyText="No requests to show."
          emptyIcon="file-tray-full-outline"
        />

        {!loading &&
          !error &&
          requests.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onPress={() => navigation.navigate('BookingDetails', { booking: b })}
            />
          ))}
      </Screen>
    </>
  );
}
