import * as FileSystem from 'expo-file-system/legacy';
import { apiFetch, loadToken, ApiError } from './client';
import { API_BASE_URL } from '../config';
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

/**
 * Download the period's bookings as a CSV file (Campus Pro). Returns the local
 * file URI for sharing. Throws ApiError (e.g. 402) on failure.
 */
export async function downloadReportCsv(period: ReportPeriod = 'month'): Promise<string> {
  const token = await loadToken();
  const target = `${FileSystem.cacheDirectory}campusbook-report-${period}.csv`;
  const res = await FileSystem.downloadAsync(
    `${API_BASE_URL}/api/reports/export?period=${period}`,
    target,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (res.status === 402) throw new ApiError(402, 'Report export is a Campus Pro feature.');
  if (res.status < 200 || res.status >= 300) {
    throw new ApiError(res.status, 'Could not export the report.');
  }
  return res.uri;
}
