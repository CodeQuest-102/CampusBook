import { apiFetch } from './client';
import type { BookingResponse, BookingPayload } from './types';

export function createBooking(payload: BookingPayload): Promise<BookingResponse> {
  return apiFetch<BookingResponse>('/api/bookings', { method: 'POST', body: payload });
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

export function cancelBooking(id: number | string): Promise<BookingResponse> {
  return apiFetch<BookingResponse>(`/api/bookings/${id}/cancel`, { method: 'POST' });
}
