import { apiFetch } from './client';
import type {
  AuthResponse,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
  ResendVerificationPayload,
  ResetPasswordPayload,
  VerifyEmailPayload,
} from './types';

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: payload,
    auth: false,
  });
}

/** No token in the response — the account can't log in until its email is verified. */
export function register(payload: RegisterPayload): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: payload,
    auth: false,
  });
}

/** Submit the emailed code to finish verifying a self-registered account. */
export function verifyEmail(payload: VerifyEmailPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/verify-email', {
    method: 'POST',
    body: payload,
    auth: false,
  });
}

/** Ask for a fresh verification code. Always resolves (no account oracle). */
export function resendVerification(payload: ResendVerificationPayload): Promise<void> {
  return apiFetch<void>('/api/auth/resend-verification', {
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
