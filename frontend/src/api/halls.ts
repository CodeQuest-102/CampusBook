import { apiFetch } from './client';
import type { HallResponse, HallPayload, HallAvailabilityResponse } from './types';

/** Active halls, visible to any authenticated user. */
export function listHalls(): Promise<HallResponse[]> {
  return apiFetch<HallResponse[]>('/api/halls');
}

/** All halls including disabled ones (admin only). */
export function listAllHalls(): Promise<HallResponse[]> {
  return apiFetch<HallResponse[]>('/api/halls/admin');
}

export function getHall(id: number | string): Promise<HallResponse> {
  return apiFetch<HallResponse>(`/api/halls/${id}`);
}

export function getAvailability(
  id: number | string,
  date: string,
): Promise<HallAvailabilityResponse> {
  return apiFetch<HallAvailabilityResponse>(`/api/halls/${id}/availability?date=${date}`);
}

export function createHall(payload: HallPayload): Promise<HallResponse> {
  return apiFetch<HallResponse>('/api/halls', { method: 'POST', body: payload });
}

export function updateHall(id: number | string, payload: HallPayload): Promise<HallResponse> {
  return apiFetch<HallResponse>(`/api/halls/${id}`, { method: 'PUT', body: payload });
}

export function disableHall(id: number | string): Promise<HallResponse> {
  return apiFetch<HallResponse>(`/api/halls/${id}`, { method: 'DELETE' });
}
