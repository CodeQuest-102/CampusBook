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
  Button,
} from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { studentStats } from '../../data/placeholder';
import { useApp } from '../../navigation/AppContext';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function StudentDashboard() {
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
            <Text style={styles.promoTitle}>Find the perfect room</Text>
            <Text style={styles.promoBody}>for your lecture or event</Text>
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
          <View style={styles.promoIcon}>
            <Ionicons name="business" size={40} color="rgba(255,255,255,0.9)" />
          </View>
        </View>

        <SectionHeader title="Quick Stats" />
        <View style={styles.statsRow}>
          <StatTile icon="bookmark" count={studentStats.booked} label="Booked" />
          <View style={{ width: spacing.md }} />
          <StatTile icon="time" count={studentStats.pending} label="Pending" tone="pending" />
          <View style={{ width: spacing.md }} />
          <StatTile
            icon="checkmark-circle"
            count={studentStats.approved}
            label="Approved"
            tone="approved"
          />
        </View>

        <SectionHeader title="Quick Actions" />
        <View style={styles.actionsGrid}>
          <QuickAction
            icon="business"
            label="Browse Rooms"
            onPress={() => navigation.navigate('BrowseRooms')}
          />
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
  promoBody: { color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  promoBtn: { marginTop: spacing.lg },
  promoIcon: { marginLeft: spacing.md },
  statsRow: { flexDirection: 'row' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
