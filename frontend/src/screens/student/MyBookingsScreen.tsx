import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar, BookingCard } from '../../components';
import { colors, fontWeight, radius, spacing } from '../../theme';
import { myBookings } from '../../data/placeholder';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const TABS = ['All', 'Approved', 'Pending', 'Rejected'] as const;

export default function MyBookingsScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<(typeof TABS)[number]>('All');

  const filtered = myBookings.filter((b) =>
    tab === 'All' ? true : b.status === tab.toLowerCase()
  );

  return (
    <>
      <TopBar variant="title" title="My Bookings" />
      <Screen scroll>
        <View style={styles.tabs}>
          {TABS.map((t) => {
            const on = tab === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.tab, on && styles.tabActive]}
                onPress={() => setTab(t)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, on && styles.tabTextActive]}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ marginTop: spacing.lg }}>
          {filtered.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onPress={() => navigation.navigate('BookingDetails', { booking: b })}
            />
          ))}
          {filtered.length === 0 && <Text style={styles.empty}>No bookings here yet.</Text>}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', marginTop: spacing.sm },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textSecondary, fontWeight: fontWeight.medium, fontSize: 12 },
  tabTextActive: { color: colors.white },
  empty: { textAlign: 'center', color: colors.textTertiary, marginTop: spacing.huge },
});
