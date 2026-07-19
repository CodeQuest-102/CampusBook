import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Screen,
  TopBar,
  SearchBar,
  SectionHeader,
  StatTile,
  QuickAction,
  BookingCard,
  Button,
} from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { staffStats, myBookings } from '../../data/placeholder';
import { useApp } from '../../navigation/AppContext';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function StaffDashboard() {
  const navigation = useNavigation<Nav>();
  const { displayName } = useApp();

  return (
    <>
      <TopBar
        variant="greeting"
        greeting="Good Morning,"
        name={displayName}
        notificationCount={2}
        onNotifications={() => navigation.navigate('Main', { screen: 'Notifications' })}
        onProfile={() => navigation.navigate('Main', { screen: 'Profile' })}
      />
      <Screen scroll>
        <SearchBar
          onPress={() => navigation.navigate('BrowseRooms')}
          onFilter={() => navigation.navigate('BrowseRooms')}
        />

        <View style={styles.promo}>
          <View style={{ flex: 1 }}>
            <Text style={styles.promoTitle}>Browse Rooms</Text>
            <Text style={styles.promoBody}>Check availability and book a room for your classes</Text>
            <Button
              title="Browse Rooms"
              variant="secondary"
              size="md"
              fullWidth={false}
              icon="search"
              onPress={() => navigation.navigate('BrowseRooms')}
              style={styles.promoBtn}
            />
          </View>
          <Ionicons name="school" size={40} color="rgba(255,255,255,0.9)" />
        </View>

        <SectionHeader title="Overview" />
        <View style={styles.statsRow}>
          <StatTile icon="calendar" count={staffStats.upcoming} label="Upcoming" />
          <View style={{ width: spacing.md }} />
          <StatTile icon="time" count={staffStats.pending} label="Pending" tone="pending" />
          <View style={{ width: spacing.md }} />
          <StatTile
            icon="checkmark-circle"
            count={staffStats.approved}
            label="Approved"
            tone="approved"
          />
        </View>

        <SectionHeader title="Quick Actions" />
        <View style={styles.actionsGrid}>
          <QuickAction icon="business" label="Browse Rooms" onPress={() => navigation.navigate('BrowseRooms')} />
          <QuickAction
            icon="bookmark"
            label="My Bookings"
            onPress={() => navigation.navigate('Main', { screen: 'Bookings' })}
          />
          <QuickAction
            icon="calendar"
            label="Calendar"
            onPress={() => navigation.navigate('Main', { screen: 'Calendar' })}
          />
          <QuickAction
            icon="notifications"
            label="Notifications"
            onPress={() => navigation.navigate('Main', { screen: 'Notifications' })}
          />
        </View>

        <SectionHeader title="Recent Bookings" actionLabel="See all" onAction={() => navigation.navigate('Main', { screen: 'Bookings' })} />
        {myBookings.slice(0, 2).map((b) => (
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

const styles = StyleSheet.create({
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginTop: spacing.lg,
  },
  promoTitle: { ...typography.h3, color: colors.white },
  promoBody: { color: 'rgba(255,255,255,0.85)', marginTop: 2, paddingRight: spacing.md },
  promoBtn: { marginTop: spacing.lg },
  statsRow: { flexDirection: 'row' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
