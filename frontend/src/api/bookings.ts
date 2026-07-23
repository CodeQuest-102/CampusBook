import { apiFetch } from './client';
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
