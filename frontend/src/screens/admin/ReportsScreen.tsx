import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, TopBar, StateView } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import { reportsApi } from '../../api';
import type { ReportPeriod } from '../../api/reports';
import { useApiData } from '../../hooks/useApiData';

const PERIODS: { label: string; value: ReportPeriod }[] = [
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
];

export default function ReportsScreen() {
  const [periodIndex, setPeriodIndex] = useState(1);
  const period = PERIODS[periodIndex].value;

  const { data, loading, error, reload } = useApiData(() => reportsApi.getSummary(period));

  const series = data?.bookingsOverTime ?? [];
  const maxValue = Math.max(1, ...series.map((b) => b.value));

  return (
    <>
      <TopBar variant="title" title="Reports & Analytics" />
      <Screen scroll>
        <TouchableOpacity
          style={styles.period}
          activeOpacity={0.8}
          onPress={() => setPeriodIndex((i) => (i + 1) % PERIODS.length)}
        >
          <Text style={styles.periodText}>{PERIODS[periodIndex].label}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <StateView loading={loading} error={error} onRetry={reload} />

        {!loading && !error && data && (
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
              </View>
              <View style={styles.utilBarTrack}>
                <View style={[styles.utilBarFill, { width: `${data.utilizationRate}%` }]} />
              </View>
            </View>

            <Text style={styles.chartTitle}>Bookings Over Time</Text>
            <View style={styles.chartCard}>
              <View style={styles.chart}>
                {series.map((b, i) => (
                  <View key={`${b.label}-${i}`} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View style={[styles.bar, { height: `${(b.value / maxValue) * 100}%` }]} />
                    </View>
                    <Text style={styles.barLabel}>{b.label}</Text>
                  </View>
                ))}
              </View>
            </View>
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
  period: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  periodText: { fontWeight: '600', color: colors.text, marginRight: spacing.sm },
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
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 160 },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { flex: 1, width: 18, justifyContent: 'flex-end' },
  bar: { width: 18, borderRadius: radius.sm, backgroundColor: colors.primary },
  barLabel: { ...typography.caption, marginTop: spacing.sm },
});
