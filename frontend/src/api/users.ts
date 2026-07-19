import { apiFetch } from './client';
import type { UserResponse, BackendRole } from './types';

/** User directory (admin only). Optional backend-role filter. */
export function listUsers(role?: BackendRole): Promise<UserResponse[]> {
  const query = role ? `?role=${role}` : '';
  return apiFetch<UserResponse[]>(`/api/users${query}`);
}
