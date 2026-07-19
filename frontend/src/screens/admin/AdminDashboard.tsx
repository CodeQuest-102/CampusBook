import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Screen,
  TopBar,
  SectionHeader,
  QuickAction,
  BookingCard,
} from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { reportsApi, bookingsApi, bookingToUi } from '../../api';
import { useApiData } from '../../hooks/useApiData';
import { useApp } from '../../navigation/AppContext';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AdminDashboard() {
  const navigation = useNavigation<Nav>();
  const { displayName } = useApp();

  const { data } = useApiData(async () => {
    const [summary, bookings] = await Promise.all([
      reportsApi.getSummary('month'),
      bookingsApi.allBookings().catch(() => []),
    ]);
    return {
      overview: summary.overview,
      recent: bookings.slice(0, 2).map(bookingToUi),
    };
  });

  const overview = data?.overview ?? { totalRooms: 0, totalBookings: 0, pendingRequests: 0 };
  const recent = data?.recent ?? [];

  return (
    <>
      <TopBar
        variant="greeting"
        greeting="Good Morning,"
        name={displayName}
        notificationCount={overview.pendingRequests}
        onNotifications={() => navigation.navigate('Main', { screen: 'Requests' })}
        onProfile={() => navigation.navigate('Main', { screen: 'Profile' })}
      />
      <Screen scroll>
        <View style={styles.overview}>
          <Text style={styles.overviewTitle}>System Overview</Text>
          <View style={styles.overviewRow}>
            <OverviewStat count={overview.totalRooms} label="Total Rooms" />
            <View style={styles.vline} />
            <OverviewStat count={overview.totalBookings} label="Total Bookings" />
            <View style={styles.vline} />
            <OverviewStat count={overview.pendingRequests} label="Pending Requests" />
          </View>
        </View>

        <SectionHeader title="Quick Actions" />
        <View style={styles.actionsGrid}>
          <QuickAction
            icon="file-tray-full"
            label="Requests"
            onPress={() => navigation.navigate('Main', { screen: 'Requests' })}
          />
          <QuickAction
            icon="grid"
            label="Manage Rooms"
            onPress={() => navigation.navigate('RoomManagement')}
          />
          <QuickAction
            icon="bar-chart"
            label="Reports"
            onPress={() => navigation.navigate('Main', { screen: 'Reports' })}
          />
          <QuickAction icon="people" label="Users" onPress={() => navigation.navigate('Users')} />
        </View>

        <SectionHeader
          title="Recent Bookings"
          actionLabel="See all"
          onAction={() => navigation.navigate('Main', { screen: 'Requests' })}
        />
        {recent.map((b) => (
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

function OverviewStat({ count, label }: { count: number; label: string }) {
  return (
    <View style={styles.overviewStat}>
      <Text style={styles.overviewCount}>{count}</Text>
      <Text style={styles.overviewLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overview: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginTop: spacing.lg,
  },
  overviewTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginBottom: spacing.lg },
  overviewRow: { flexDirection: 'row', alignItems: 'center' },
  overviewStat: { flex: 1, alignItems: 'center' },
  overviewCount: { color: colors.white, fontSize: 28, fontWeight: '700' },
  overviewLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  vline: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
