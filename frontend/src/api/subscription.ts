import { apiFetch } from './client';
import type { SubscriptionResponse, PlanResponse, SubscriptionTier } from './types';

/** Current institution subscription + live usage (admin only). */
export function getSubscription(): Promise<SubscriptionResponse> {
  return apiFetch<SubscriptionResponse>('/api/subscription');
}

/** Catalog of all plans for the upgrade screen (admin only). */
export function getPlans(): Promise<PlanResponse[]> {
  return apiFetch<PlanResponse[]>('/api/subscription/plans');
}

/** Simulated upgrade/downgrade to a tier (admin only). */
export function upgrade(tier: SubscriptionTier): Promise<SubscriptionResponse> {
  return apiFetch<SubscriptionResponse>('/api/subscription/upgrade', {
    method: 'POST',
    body: { tier },
  });
}
