import { apiFetch } from './client';
import type { ReportsResponse, ReportsOverview } from './types';

export type ReportPeriod = 'week' | 'month' | 'year';

/** Basic system counts — available to all admins on any plan. */
export function getOverview(): Promise<ReportsOverview> {
  return apiFetch<ReportsOverview>('/api/reports/overview');
}

/** Aggregated analytics dashboard — Campus Pro only (throws 402 otherwise). */
export function getSummary(period: ReportPeriod = 'month'): Promise<ReportsResponse> {
  return apiFetch<ReportsResponse>(`/api/reports/summary?period=${period}`);
}
