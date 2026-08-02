import React from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar, StateView, StatusPill } from '../../components';
import { colors, fontWeight, radius, shadow, spacing, typography } from '../../theme';
import { platformApi } from '../../api';
import { useApiData } from '../../hooks/useApiData';
import type { InstitutionSummaryResponse } from '../../api/types';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TIER_LABEL: Record<InstitutionSummaryResponse['tier'], string> = {
  FREE: 'Free',
  CAMPUS_PRO: 'Campus Pro',
  ENTERPRISE: 'Enterprise',
};

/**
 * Platform-admin home: every real institution in the system with basic usage
 * stats. Read-only for v1 — onboarding a school (below) is the only write
 * path here.
 */
export default function InstitutionsScreen() {
  const navigation = useNavigation<Nav>();

  const { data, loading, refreshing, error, reload, refresh } = useApiData(
    platformApi.listInstitutions,
  );

  const institutions = data ?? [];

  return (
    <>
      <TopBar
        variant="title"
        title="Institutions"
        rightIcon="add"
        onRight={() => navigation.navigate('CreateInstitution')}
      />
      <Screen
        scroll
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        <StateView
          loading={loading}
          error={error}
          onRetry={reload}
          empty={!loading && !error && institutions.length === 0}
          emptyText="No institutions yet. Add the first one to get started."
          emptyIcon="business-outline"
        />

        {!loading && !error && (
          <View style={{ marginTop: spacing.lg }}>
            {institutions.map((i) => (
              <InstitutionCard key={i.id} institution={i} />
            ))}
          </View>
        )}
      </Screen>
    </>
  );
}

function InstitutionCard({ institution }: { institution: InstitutionSummaryResponse }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{institution.name}</Text>
          <Text style={styles.domain}>{institution.emailDomain}</Text>
        </View>
        <StatusPill label={TIER_LABEL[institution.tier]} tone="neutral" />
      </View>

      <View style={styles.statsRow}>
        <Stat count={institution.hallCount} label="Rooms" />
        <View style={styles.vline} />
        <Stat count={institution.bookingCount} label="Bookings" />
        <View style={styles.vline} />
        <Stat count={institution.userCount} label="Users" />
      </View>
    </View>
  );
}

function Stat({ count, label }: { count: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  name: { ...typography.title, fontSize: 16 },
  domain: { ...typography.caption, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  stat: { flex: 1, alignItems: 'center' },
  statCount: { ...typography.title, fontSize: 18, fontWeight: fontWeight.bold },
  statLabel: { ...typography.caption, marginTop: 2 },
  vline: { width: 1, height: 28, backgroundColor: colors.divider },
});
