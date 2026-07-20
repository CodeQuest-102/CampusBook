import { apiFetch } from './client';
import type { UserResponse, BackendRole, UpdateProfilePayload } from './types';

/** User directory (admin only). Optional backend-role filter. */
export function listUsers(role?: BackendRole): Promise<UserResponse[]> {
  const query = role ? `?role=${role}` : '';
  return apiFetch<UserResponse[]>(`/api/users${query}`);
}

/** The signed-in user's own profile. */
export function getMe(): Promise<UserResponse> {
  return apiFetch<UserResponse>('/api/users/me');
}

/** Update the signed-in user's own name / department. */
export function updateMe(patch: UpdateProfilePayload): Promise<UserResponse> {
  return apiFetch<UserResponse>('/api/users/me', { method: 'PATCH', body: patch });
}
