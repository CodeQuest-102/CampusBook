import { apiFetch } from './client';
import type {
  UserResponse,
  BackendRole,
  UpdateProfilePayload,
  AdminCreateUserPayload,
} from './types';

/** User directory for the admin's own institution. Optional backend-role filter. */
export function listUsers(role?: BackendRole): Promise<UserResponse[]> {
  const query = role ? `?role=${role}` : '';
  return apiFetch<UserResponse[]>(`/api/users${query}`);
}

/**
 * Provision an account for someone at the admin's institution (admin only).
 * Unlike sign-up this can create another admin.
 */
export function createUser(payload: AdminCreateUserPayload): Promise<UserResponse> {
  return apiFetch<UserResponse>('/api/users', { method: 'POST', body: payload });
}

/** The signed-in user's own profile. */
export function getMe(): Promise<UserResponse> {
  return apiFetch<UserResponse>('/api/users/me');
}

/** Update the signed-in user's own name / department. */
export function updateMe(patch: UpdateProfilePayload): Promise<UserResponse> {
  return apiFetch<UserResponse>('/api/users/me', { method: 'PATCH', body: patch });
}
