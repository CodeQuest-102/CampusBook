import { apiFetch } from './client';
import type { ReportsResponse } from './types';

export type ReportPeriod = 'week' | 'month' | 'year';

/** Aggregated analytics (admin only). */
export function getSummary(period: ReportPeriod = 'month'): Promise<ReportsResponse> {
  return apiFetch<ReportsResponse>(`/api/reports/summary?period=${period}`);
}
