import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar, BookingCard } from '../../components';
import { myBookings } from '../../data/placeholder';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MyRequests'>;

/** The user's submitted booking requests (mock — reuses booking data). */
export default function MyRequestsScreen({ navigation }: Props) {
  return (
    <>
      <TopBar variant="title" title="My Requests" onBack={() => navigation.goBack()} />
      <Screen scroll>
        {myBookings.map((b) => (
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
