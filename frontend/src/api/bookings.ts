import * as FileSystem from 'expo-file-system/legacy';
import { apiFetch, loadToken, ApiError } from './client';
import { API_BASE_URL } from '../config';
import type {
  BookingResponse,
  BookingPayload,
  BookingAuditResponse,
  BulkActionResponse,
  ReschedulePayload,
  RecurringBookingPayload,
  RecurringBookingResponse,
} from './types';

export function createBooking(payload: BookingPayload): Promise<BookingResponse> {
  return apiFetch<BookingResponse>('/api/bookings', { method: 'POST', body: payload });
}

export function createRecurring(
  payload: RecurringBookingPayload,
): Promise<RecurringBookingResponse> {
  return apiFetch<RecurringBookingResponse>('/api/bookings/recurring', {
    method: 'POST',
    body: payload,
  });
}

export function myBookings(): Promise<BookingResponse[]> {
  return apiFetch<BookingResponse[]>('/api/bookings/my');
}

/** All bookings (admin only). */
export function allBookings(): Promise<BookingResponse[]> {
  return apiFetch<BookingResponse[]>('/api/bookings');
}

/** Pending bookings awaiting approval (admin only). */
export function pendingBookings(): Promise<BookingResponse[]> {
  return apiFetch<BookingResponse[]>('/api/bookings/pending');
}

export function approveBooking(id: number | string): Promise<BookingResponse> {
  return apiFetch<BookingResponse>(`/api/bookings/${id}/approve`, { method: 'POST' });
}

/**
 * Approved and still-pending bookings competing with this one for its room and
 * window (admin only). Lets the admin see the clash before deciding, instead of
 * discovering it when an approval bounces.
 */
export function conflicts(id: number | string): Promise<BookingResponse[]> {
  return apiFetch<BookingResponse[]>(`/api/bookings/${id}/conflicts`);
}

export function rejectBooking(id: number | string, reason?: string): Promise<BookingResponse> {
  return apiFetch<BookingResponse>(`/api/bookings/${id}/reject`, {
    method: 'POST',
    body: reason ? { reason } : undefined,
  });
}

/**
 * Approve several requests at once (admin). Individual ids can fail — always
 * check `failed` in the response rather than assuming success.
 */
export function bulkApprove(ids: (number | string)[]): Promise<BulkActionResponse> {
  return apiFetch<BulkActionResponse>('/api/bookings/bulk-approve', {
    method: 'POST',
    body: { ids: ids.map(Number) },
  });
}

/** Reject several requests at once with a shared reason (admin). */
export function bulkReject(
  ids: (number | string)[],
  reason?: string,
): Promise<BulkActionResponse> {
  return apiFetch<BulkActionResponse>('/api/bookings/bulk-reject', {
    method: 'POST',
    body: { ids: ids.map(Number), reason },
  });
}

/**
 * Download one booking as an .ics file, returning the local URI to share.
 * Same file-then-share route as the Campus Pro CSV export, so no extra native
 * module is needed and it still works in Expo Go.
 */
export async function downloadBookingIcs(id: number | string): Promise<string> {
  return downloadIcs(`/api/bookings/${id}/calendar.ics`, `campusbook-booking-${id}.ics`);
}

/** Download the signed-in user's approved bookings as a single .ics feed. */
export async function downloadMyBookingsIcs(): Promise<string> {
  return downloadIcs('/api/bookings/my/calendar.ics', 'campusbook-my-bookings.ics');
}

async function downloadIcs(path: string, filename: string): Promise<string> {
  const token = await loadToken();
  // This bypasses apiFetch (FileSystem.downloadAsync needs a URI, not a fetch
  // Response), so a missing token would otherwise go out with no Authorization
  // header at all and come back as a generic "could not export" — instead of
  // the clear "please sign in again" apiFetch gives every other request.
  if (!token) {
    throw new ApiError(401, 'Your session has expired. Please log in again.');
  }
  const res = await FileSystem.downloadAsync(
    `${API_BASE_URL}${path}`,
    `${FileSystem.cacheDirectory}${filename}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (res.status < 200 || res.status >= 300) {
    throw new ApiError(res.status, 'Could not export this booking to your calendar.');
  }
  return res.uri;
}

/** A booking's audit trail — visible to its booker and to admins. */
export function bookingHistory(id: number | string): Promise<BookingAuditResponse[]> {
  return apiFetch<BookingAuditResponse[]>(`/api/bookings/${id}/history`);
}

export function cancelBooking(id: number | string): Promise<BookingResponse> {
  return apiFetch<BookingResponse>(`/api/bookings/${id}/cancel`, { method: 'POST' });
}

export function reschedule(
  id: number | string,
  payload: ReschedulePayload,
): Promise<BookingResponse> {
  return apiFetch<BookingResponse>(`/api/bookings/${id}/reschedule`, { method: 'PUT', body: payload });
}
