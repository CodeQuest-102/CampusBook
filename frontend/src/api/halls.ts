import { apiFetch } from './client';
import type { HallResponse, HallPayload, HallAvailabilityResponse } from './types';

/**
 * Optional server-side filters for {@link listHalls}. Equipment flags are
 * "require" filters — pass true to keep only rooms that have the feature.
 * `freeFrom`/`freeUntil` (ISO date-times) must be supplied together and keep only
 * rooms with no approved booking overlapping that window.
 */
export interface HallFilters {
  q?: string;
  minCapacity?: number;
  projector?: boolean;
  ac?: boolean;
  microphone?: boolean;
  freeFrom?: string;
  freeUntil?: string;
}

/** Active halls, visible to any authenticated user. Filtering happens server-side. */
export function listHalls(filters: HallFilters = {}): Promise<HallResponse[]> {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.minCapacity) params.set('minCapacity', String(filters.minCapacity));
  if (filters.projector) params.set('projector', 'true');
  if (filters.ac) params.set('ac', 'true');
  if (filters.microphone) params.set('microphone', 'true');
  if (filters.freeFrom && filters.freeUntil) {
    params.set('freeFrom', filters.freeFrom);
    params.set('freeUntil', filters.freeUntil);
  }
  const query = params.toString();
  return apiFetch<HallResponse[]>(`/api/halls${query ? `?${query}` : ''}`);
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

/** Put a room into maintenance (`false`) or bring it back (`true`). */
export function setHallActive(id: number | string, active: boolean): Promise<HallResponse> {
  return apiFetch<HallResponse>(`/api/halls/${id}/active`, {
    method: 'PATCH',
    body: { active },
  });
}

/**
 * Remove a room for good. Rejected with a 400 when the room has bookings
 * against it — those have to go into maintenance instead, so the booking
 * history keeps pointing at something real.
 */
export function deleteHall(id: number | string): Promise<void> {
  return apiFetch<void>(`/api/halls/${id}`, { method: 'DELETE' });
}
