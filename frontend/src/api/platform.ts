import { apiFetch } from './client';
import type { CreateInstitutionPayload, InstitutionSummaryResponse } from './types';

/** Platform-admin only: create a new institution + its first admin account in one step. */
export function createInstitution(payload: CreateInstitutionPayload): Promise<InstitutionSummaryResponse> {
  return apiFetch<InstitutionSummaryResponse>('/api/platform/institutions', { method: 'POST', body: payload });
}

/** Platform-admin only: every institution in the system with basic usage stats. */
export function listInstitutions(): Promise<InstitutionSummaryResponse[]> {
  return apiFetch<InstitutionSummaryResponse[]>('/api/platform/institutions');
}
