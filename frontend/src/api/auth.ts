import { apiFetch } from './client';
import type {
  AuthResponse,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
} from './types';

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: payload,
    auth: false,
  });
}

export function register(payload: RegisterPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: payload,
    auth: false,
  });
}

/** Step 1: ask for a reset code to be emailed. Always resolves (no account oracle). */
export function forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
  return apiFetch<void>('/api/auth/forgot-password', {
    method: 'POST',
    body: payload,
    auth: false,
  });
}

/** Step 2: submit the emailed code and the new password. */
export function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  return apiFetch<void>('/api/auth/reset-password', {
    method: 'POST',
    body: payload,
    auth: false,
  });
}
