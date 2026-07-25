import React, { useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar, BookingCard, StateView } from '../../components';
import { colors, fontWeight, radius, spacing } from '../../theme';
import { bookingsApi, bookingToUi, ApiError } from '../../api';
import { useApiData } from '../../hooks/useApiData';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const TABS = ['All', 'Approved', 'Pending', 'Rejected'] as const;

export default function MyBookingsScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<(typeof TABS)[number]>('All');
  const [exporting, setExporting] = useState(false);

  const { data, loading, refreshing, error, reload, refresh } = useApiData(async () =>
    (await bookingsApi.myBookings()).map(bookingToUi),
  );

  const bookings = data ?? [];
  const filtered = bookings.filter((b) =>
    tab === 'All' ? true : b.status === tab.toLowerCase(),
  );

  /** Export approved bookings as one .ics feed and hand it to the share sheet. */
  const exportCalendar = async () => {
    setExporting(true);
    try {
      const uri = await bookingsApi.downloadMyBookingsIcs();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'text/calendar',
          dialogTitle: 'Export my bookings',
        });
      } else {
        Alert.alert('Saved', `Calendar file saved to:\n${uri}`);
      }
    } catch (e) {
      Alert.alert('Export failed', e instanceof ApiError ? e.message : 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <TopBar variant="title" title="My Bookings" />
      <Screen
        scroll
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
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

        {bookings.some((b) => b.status === 'approved') && (
          <TouchableOpacity
            style={styles.exportRow}
            onPress={exportCalendar}
            disabled={exporting}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Ionicons name="calendar-number-outline" size={16} color={colors.primary} />
            <Text style={styles.exportText}>
              {exporting ? 'Preparing…' : 'Export approved bookings to calendar'}
            </Text>
          </TouchableOpacity>
        )}

        <StateView
          loading={loading}
          error={error}
          onRetry={reload}
          empty={!loading && !error && filtered.length === 0}
          emptyText="No bookings here yet."
          emptyIcon="bookmark-outline"
        />

        {!loading && !error && (
          <View style={{ marginTop: spacing.lg }}>
            {filtered.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                onPress={() => navigation.navigate('BookingDetails', { booking: b })}
              />
            ))}
          </View>
        )}
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
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  exportText: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: 13 },
});
