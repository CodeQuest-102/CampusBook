import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, TopBar, Button, StateView, StatusPill } from '../../components';
import { colors, fontWeight, radius, shadow, spacing, typography } from '../../theme';
import { subscriptionApi, ApiError } from '../../api';
import type { SubscriptionResponse, PlanResponse, SubscriptionTier } from '../../api/types';
import { useApiData } from '../../hooks/useApiData';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Subscription'>;

const ORDER: SubscriptionTier[] = ['FREE', 'CAMPUS_PRO', 'ENTERPRISE'];

function limitLabel(n: number | null): string {
  return n == null ? 'Unlimited' : String(n);
}

export default function SubscriptionScreen({ navigation }: Props) {
  const [busyTier, setBusyTier] = useState<SubscriptionTier | null>(null);

  const { data, loading, error, reload } = useApiData(async () => {
    const [subscription, plans] = await Promise.all([
      subscriptionApi.getSubscription(),
      subscriptionApi.getPlans(),
    ]);
    return { subscription, plans };
  });

  const sub = data?.subscription;
  const plans = data?.plans ?? [];

  const changeTier = (plan: PlanResponse, direction: 'Upgrade' | 'Downgrade') => {
    const confirmLabel = direction === 'Upgrade' ? 'Confirm & Pay' : 'Downgrade';
    const message =
      direction === 'Upgrade'
        ? `Upgrade to ${plan.name} (${plan.priceLabel})?\n\nThis is a simulated payment for the demo — no card will be charged.`
        : `Switch to ${plan.name}? Your plan limits will apply to new rooms and bookings.`;

    Alert.alert(`${direction} plan`, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: confirmLabel,
        onPress: async () => {
          setBusyTier(plan.tier);
          try {
            await subscriptionApi.upgrade(plan.tier);
            if (direction === 'Upgrade') {
              Alert.alert('Payment successful', `You're now on ${plan.name}.`);
            }
            reload();
          } catch (e) {
            Alert.alert('Could not change plan', e instanceof ApiError ? e.message : 'Please try again.');
          } finally {
            setBusyTier(null);
          }
        },
      },
    ]);
  };

  return (
    <>
      <TopBar variant="title" title="Subscription" onBack={() => navigation.goBack()} />
      <Screen scroll>
        <StateView loading={loading} error={error} onRetry={reload} />

        {!loading && !error && sub && (
          <>
            <CurrentPlanCard sub={sub} />

            <Text style={styles.sectionTitle}>Plans</Text>
            {plans.map((plan) => (
              <PlanCard
                key={plan.tier}
                plan={plan}
                currentTier={sub.tier}
                busy={busyTier === plan.tier}
                onChange={changeTier}
              />
            ))}

            <Text style={styles.footNote}>
              Billing is handled at the institution level — individual students and staff are never
              charged.
            </Text>
          </>
        )}
      </Screen>
    </>
  );
}

function CurrentPlanCard({ sub }: { sub: SubscriptionResponse }) {
  return (
    <View style={styles.currentCard}>
      <View style={styles.currentHeader}>
        <View>
          <Text style={styles.currentLabel}>Current plan</Text>
          <Text style={styles.currentName}>{sub.planName}</Text>
          <Text style={styles.currentPrice}>{sub.priceLabel}</Text>
        </View>
        <StatusPill
          label={sub.tier === 'FREE' ? 'Free' : 'Active'}
          tone={sub.tier === 'FREE' ? 'neutral' : 'available'}
        />
      </View>

      <View style={styles.divider} />

      <UsageMeter label="Rooms" used={sub.activeHallsUsed} limit={sub.activeHallLimit} />
      <UsageMeter
        label="Bookings this month"
        used={sub.monthlyBookingsUsed}
        limit={sub.monthlyBookingLimit}
      />
    </View>
  );
}

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit == null ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const atLimit = limit != null && used >= limit;
  return (
    <View style={styles.meter}>
      <View style={styles.meterRow}>
        <Text style={styles.meterLabel}>{label}</Text>
        <Text style={[styles.meterValue, atLimit && { color: colors.danger }]}>
          {used} / {limitLabel(limit)}
        </Text>
      </View>
      {limit != null && (
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${pct}%`, backgroundColor: atLimit ? colors.danger : colors.primary },
            ]}
          />
        </View>
      )}
    </View>
  );
}

function PlanCard({
  plan,
  currentTier,
  busy,
  onChange,
}: {
  plan: PlanResponse;
  currentTier: SubscriptionTier;
  busy: boolean;
  onChange: (plan: PlanResponse, direction: 'Upgrade' | 'Downgrade') => void;
}) {
  const isCurrent = plan.tier === currentTier;
  const direction: 'Upgrade' | 'Downgrade' =
    ORDER.indexOf(plan.tier) > ORDER.indexOf(currentTier) ? 'Upgrade' : 'Downgrade';

  return (
    <View style={[styles.planCard, isCurrent && styles.planCardCurrent]}>
      <View style={styles.planHeader}>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planPrice}>{plan.priceLabel}</Text>
      </View>

      <View style={styles.features}>
        {plan.features.map((f) => (
          <View key={f} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      {isCurrent ? (
        <View style={styles.currentBtn}>
          <Ionicons name="checkmark" size={16} color={colors.primary} />
          <Text style={styles.currentBtnText}>Current Plan</Text>
        </View>
      ) : !plan.selfServe ? (
        <Button
          title="Contact Sales"
          variant="outline"
          onPress={() =>
            Alert.alert(
              'Enterprise',
              'Enterprise plans are tailored to your institution. Contact the CampusBook team to get started.',
            )
          }
        />
      ) : (
        <Button
          title={direction === 'Upgrade' ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}
          variant={direction === 'Upgrade' ? 'primary' : 'secondary'}
          loading={busy}
          onPress={() => onChange(plan, direction)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  currentCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadow.card,
  },
  currentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  currentLabel: { ...typography.caption },
  currentName: { ...typography.h3, marginTop: 2 },
  currentPrice: { ...typography.bodyMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.lg },
  meter: { marginBottom: spacing.md },
  meterRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  meterLabel: { ...typography.body, color: colors.textSecondary },
  meterValue: { ...typography.body, fontWeight: fontWeight.semibold },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: colors.cardAlt, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  sectionTitle: { ...typography.title, marginTop: spacing.xl, marginBottom: spacing.md },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  planCardCurrent: { borderColor: colors.primary, borderWidth: 2 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  planName: { ...typography.title, fontSize: 17 },
  planPrice: { ...typography.body, color: colors.primary, fontWeight: fontWeight.semibold },
  features: { marginTop: spacing.md, marginBottom: spacing.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  featureText: { ...typography.body, color: colors.textSecondary, marginLeft: spacing.sm, flex: 1 },
  currentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  currentBtnText: { color: colors.primary, fontWeight: fontWeight.semibold, marginLeft: 6 },
  footNote: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },
});
