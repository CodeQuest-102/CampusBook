export const BASE_URL = 'http://10.130.198.89:8080';

// ─── All API endpoints ────
export const ENDPOINTS = {
  // Auth
  REGISTER:         '/api/auth/register',
  LOGIN:            '/api/auth/login',

  // Halls
  HALLS:            '/api/halls',
  HALL_BY_ID:       (id: number) => `/api/halls/${id}`,

  // Bookings
  BOOKINGS:         '/api/bookings',
  MY_BOOKINGS:      '/api/bookings/my',
  ALL_BOOKINGS:     '/api/bookings',
  PENDING_BOOKINGS: '/api/bookings/pending',
  APPROVE_BOOKING:  (id: number) => `/api/bookings/${id}/approve`,
  REJECT_BOOKING:   (id: number) => `/api/bookings/${id}/reject`,
  CANCEL_BOOKING:   (id: number) => `/api/bookings/${id}/cancel`,

  // Notifications
  NOTIFICATIONS:    '/api/notifications',
  MARK_READ:        (id: number) => `/api/notifications/${id}/read`,
};