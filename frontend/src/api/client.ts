import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config';

const TOKEN_KEY = 'campusbook.token';

/** In-memory cache so requests don't hit SecureStore on every call. */
let cachedToken: string | null = null;

/** Registered by the auth layer so a 401 can force a global sign-out. */
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export async function loadToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return cachedToken;
}

export async function saveToken(token: string): Promise<void> {
  cachedToken = token;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  cachedToken = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/** Error carrying the backend's HTTP status and message (from ErrorResponse). */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Set false for the auth endpoints, which don't need a token. */
  auth?: boolean;
}

/**
 * Thin fetch wrapper: injects JSON headers + bearer token, parses the response,
 * and throws {@link ApiError} carrying the backend message on non-2xx.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await loadToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    throw new ApiError(0, 'Network error — is the backend running and reachable?');
  }

  if (response.status === 401) {
    await clearToken();
    onUnauthorized?.();
    throw new ApiError(401, 'Your session has expired. Please log in again.');
  }

  // 204 No Content (e.g. mark-all-read)
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const message =
      (data && (data.message as string)) || `Request failed (${response.status})`;
    throw new ApiError(response.status, message);
  }

  return data as T;
}
