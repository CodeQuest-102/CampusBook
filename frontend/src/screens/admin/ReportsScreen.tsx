import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, TopBar } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import { analytics } from '../../data/placeholder';

const PERIODS = ['This Week', 'This Month', 'This Year'];

export default function ReportsScreen() {
  const [periodIndex, setPeriodIndex] = useState(1);
  const maxValue = Math.max(...analytics.bookingsOverTime.map((b) => b.value));

  return (
    <>
      <TopBar variant="title" title="Reports & Analytics" />
      <Screen scroll>
        <TouchableOpacity
          style={styles.period}
          activeOpacity={0.8}
          onPress={() => setPeriodIndex((i) => (i + 1) % PERIODS.length)}
        >
          <Text style={styles.periodText}>{PERIODS[periodIndex]}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.row}>
          <StatCard
            icon="trophy-outline"
            label="Most Booked Room"
            value={analytics.mostBookedRoom.name}
            sub={`${analytics.mostBookedRoom.count} Bookings`}
          />
          <View style={{ width: spacing.md }} />
          <StatCard
            icon="flame-outline"
            label="Peak Day"
            value={analytics.peakDay.day}
            sub={`${analytics.peakDay.count} Bookings`}
          />
        </View>

        <View style={styles.utilCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.utilLabel}>Utilization Rate</Text>
            <Text style={styles.utilValue}>{analytics.utilizationRate}%</Text>
          </View>
          <View style={styles.utilBarTrack}>
            <View style={[styles.utilBarFill, { width: `${analytics.utilizationRate}%` }]} />
          </View>
        </View>

        <Text style={styles.chartTitle}>Bookings Over Time</Text>
        <View style={styles.chartCard}>
          <View style={styles.chart}>
            {analytics.bookingsOverTime.map((b) => (
              <View key={b.label} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height: `${(b.value / maxValue) * 100}%` }]} />
                </View>
                <Text style={styles.barLabel}>{b.label}</Text>
              </View>
            ))}
          </View>
        </View>
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
