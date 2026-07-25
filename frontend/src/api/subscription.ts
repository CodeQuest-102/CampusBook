import { apiFetch } from './client';
import type {
  SubscriptionResponse,
  PlanResponse,
  SubscriptionTier,
  CheckoutResponse,
} from './types';

/** Current institution subscription + live usage (admin only). */
export function getSubscription(): Promise<SubscriptionResponse> {
  return apiFetch<SubscriptionResponse>('/api/subscription');
}

/** Catalog of all plans for the upgrade screen (admin only). */
export function getPlans(): Promise<PlanResponse[]> {
  return apiFetch<PlanResponse[]>('/api/subscription/plans');
}

/**
 * Direct tier switch (admin only). Used for downgrades — including the
 * "Switch to Free" reset — and as the simulated upgrade when Paystack is off.
 */
export function upgrade(tier: SubscriptionTier): Promise<SubscriptionResponse> {
  return apiFetch<SubscriptionResponse>('/api/subscription/upgrade', {
    method: 'POST',
    body: { tier },
  });
}

/** Starts a Paystack checkout for a paid upgrade; returns the hosted URL (admin only). */
export function checkout(tier: SubscriptionTier): Promise<CheckoutResponse> {
  return apiFetch<CheckoutResponse>('/api/subscription/checkout', {
    method: 'POST',
    body: { tier },
  });
}

/** Verifies a completed Paystack payment; on success the upgrade is applied (admin only). */
export function verifyPayment(reference: string): Promise<SubscriptionResponse> {
  return apiFetch<SubscriptionResponse>('/api/subscription/verify', {
    method: 'POST',
    body: { reference },
  });
}
