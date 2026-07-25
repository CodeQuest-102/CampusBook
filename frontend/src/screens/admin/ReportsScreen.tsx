import React, { useEffect, useRef, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar, StateView, Button } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import { reportsApi, ApiError } from '../../api';
import type { ReportPeriod } from '../../api/reports';
import { useApiData } from '../../hooks/useApiData';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PERIODS: { label: string; value: ReportPeriod }[] = [
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
];

export default function ReportsScreen() {
  const navigation = useNavigation<Nav>();
  const [periodIndex, setPeriodIndex] = useState(1);
  const period = PERIODS[periodIndex].value;

  const { data, loading, refreshing, error, errorStatus, reload, refresh } = useApiData(() =>
    reportsApi.getSummary(period),
  );

  // useApiData only fetches on focus, so refetch when the selected period changes.
  // The initial period is already covered by the focus load, so skip the first run.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    reload();
  }, [period, reload]);

  // 402 = analytics is gated behind Campus Pro.
  const locked = errorStatus === 402;
  const [exporting, setExporting] = useState(false);

  const series = data?.bookingsOverTime ?? [];
  const maxValue = Math.max(1, ...series.map((b) => b.value));
  // No approved bookings in the period → nothing meaningful to chart.
  const isEmpty =
    !!data && data.mostBookedRoom.count === 0 && series.every((b) => b.value === 0);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const uri = await reportsApi.downloadReportCsv(period);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Export report' });
      } else {
        Alert.alert('Saved', `Report saved to:\n${uri}`);
      }
    } catch (e) {
      Alert.alert('Export failed', e instanceof ApiError ? e.message : 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <TopBar variant="title" title="Reports & Analytics" />
      <Screen
        scroll
        refreshControl={
          locked ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          )
        }
      >
        {locked ? (
          <View style={styles.lockCard}>
            <View style={styles.lockIcon}>
              <Ionicons name="lock-closed" size={28} color={colors.primary} />
            </View>
            <Text style={styles.lockTitle}>Analytics is a Campus Pro feature</Text>
            <Text style={styles.lockBody}>
              Upgrade to Campus Pro to unlock the analytics dashboard, utilization insights, and
              full reporting.
            </Text>
            <Button
              title="View Plans"
              icon="ribbon-outline"
              onPress={() => navigation.navigate('Subscription')}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        ) : (
          <>
            <View style={styles.segmented}>
              {PERIODS.map((p, i) => {
                const active = i === periodIndex;
                return (
                  <TouchableOpacity
                    key={p.value}
                    style={[styles.segment, active && styles.segmentActive]}
                    activeOpacity={0.8}
                    onPress={() => setPeriodIndex(i)}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.headerRow}>
              {!loading && !error && data && !isEmpty && (
                <TouchableOpacity
                  style={styles.exportBtn}
                  activeOpacity={0.8}
                  disabled={exporting}
                  onPress={exportCsv}
                >
                  <Ionicons
                    name={exporting ? 'hourglass-outline' : 'download-outline'}
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.exportText}>{exporting ? 'Exporting…' : 'Export CSV'}</Text>
                </TouchableOpacity>
              )}
            </View>

            <StateView loading={loading} error={error} onRetry={reload} />

        {!loading && !error && isEmpty && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bar-chart-outline" size={28} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No approved bookings yet</Text>
            <Text style={styles.emptyBody}>
              There are no approved bookings for {PERIODS[periodIndex].label.toLowerCase()}. Once
              rooms are booked and approved, your analytics will appear here.
            </Text>
          </View>
        )}

        {!loading && !error && data && !isEmpty && (
          <>
            <View style={styles.row}>
              <StatCard
                icon="trophy-outline"
                label="Most Booked Room"
                value={data.mostBookedRoom.name}
                sub={`${data.mostBookedRoom.count} Bookings`}
              />
              <View style={{ width: spacing.md }} />
              <StatCard
                icon="flame-outline"
                label="Peak Day"
                value={data.peakDay.name}
                sub={`${data.peakDay.count} Bookings`}
              />
            </View>

            <View style={styles.utilCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.utilLabel}>Utilization Rate</Text>
                <Text style={styles.utilValue}>{data.utilizationRate}%</Text>
                <Text style={styles.utilCaption}>of estimated room-hours</Text>
              </View>
              <View style={styles.utilBarTrack}>
                <View style={[styles.utilBarFill, { width: `${data.utilizationRate}%` }]} />
              </View>
            </View>

            <Text style={styles.chartTitle}>Bookings Over Time</Text>
            <View style={styles.chartCard}>
              <View style={styles.chart}>
                {series.map((b, i) => {
                  const isPeak = b.value > 0 && b.value === maxValue;
                  return (
                    <View key={`${b.label}-${i}`} style={styles.barCol}>
                      <Text style={styles.barValue}>{b.value > 0 ? b.value : ''}</Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.bar,
                            { height: `${(b.value / maxValue) * 100}%` },
                            b.value === 0 && styles.barEmpty,
                            isPeak && styles.barPeak,
                          ]}
                        />
                      </View>
                      <Text style={styles.barLabel}>{b.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}
          </>
        )}
      </Screen>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={2}>
        {value}
      </Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 3,
    marginTop: spacing.md,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontWeight: '600', color: colors.textSecondary, fontSize: 13 },
  segmentTextActive: { color: colors.white },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  exportText: { color: colors.primary, fontWeight: '600', fontSize: 13, marginLeft: 6 },
  lockCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    marginTop: spacing.xl,
    ...shadow.card,
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  lockTitle: { ...typography.title, fontSize: 16, textAlign: 'center' },
  lockBody: {
    ...typography.bodyMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  row: { flexDirection: 'row' },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.card,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statLabel: { ...typography.caption },
  statValue: { ...typography.title, fontSize: 15, marginTop: 3 },
  statSub: { ...typography.bodyMuted, fontSize: 12, marginTop: 2 },
  utilCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadow.card,
  },
  utilLabel: { ...typography.caption },
  utilValue: { ...typography.h2, color: colors.primary, marginTop: 2 },
  utilCaption: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  utilBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.cardAlt,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  utilBarFill: { height: '100%', borderRadius: 5, backgroundColor: colors.primary },
  chartTitle: { ...typography.title, marginTop: spacing.xl, marginBottom: spacing.md },
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.card,
  },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 180 },
  barCol: { flex: 1, alignItems: 'center' },
  barValue: { ...typography.caption, color: colors.textSecondary, fontSize: 11, marginBottom: 4 },
  barTrack: { flex: 1, width: 18, justifyContent: 'flex-end' },
  bar: { width: 18, borderRadius: radius.sm, backgroundColor: colors.primary },
  // Zero-value periods still get a faint baseline nub so the axis reads evenly.
  barEmpty: { height: 3, backgroundColor: colors.border },
  barPeak: { backgroundColor: colors.primaryDark },
  barLabel: { ...typography.caption, marginTop: spacing.sm },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    marginTop: spacing.xl,
    ...shadow.card,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: { ...typography.title, fontSize: 16, textAlign: 'center' },
  emptyBody: {
    ...typography.bodyMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
