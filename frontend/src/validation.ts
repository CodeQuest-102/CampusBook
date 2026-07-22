/**
 * Form validation rules shared between screens.
 *
 * Every rule here is also enforced by the API (RegisterRequest, BookingRequest,
 * BookingService) — these exist to catch problems before the request goes out
 * and to keep the inputs themselves constrained. The server stays the gate.
 */

import type { Role } from './data/placeholder';

/** Digits in a valid campus ID, by role. Admins are provisioned, not self-registered. */
export const CAMPUS_ID_LENGTH: Record<Role, number> = {
  student: 8,
  staff: 9,
  admin: 0,
};

/** Field label for a role's campus ID. */
export function campusIdLabel(role: Role): string {
  return role === 'staff' ? 'Staff ID' : 'Student ID';
}

/** Strips everything that isn't a digit — campus IDs are numeric. */
export function digitsOnly(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

/** Returns an error message for an invalid campus ID, or null when it's fine. */
export function validateCampusId(role: Role, value: string): string | null {
  const expected = CAMPUS_ID_LENGTH[role];
  if (!expected) return null; // admin — no self-registration rule to apply

  const id = value.trim();
  const label = campusIdLabel(role);

  if (!id) return `${label} is required.`;
  if (!/^\d+$/.test(id)) return `${label} must contain digits only.`;
  if (id.length !== expected) return `${label} must be exactly ${expected} digits.`;
  return null;
}

/* ------------------------------- email ----------------------------------- */

/**
 * CampusBook accounts belong to KNUST, so sign-up only accepts institutional
 * addresses. Any subdomain is allowed (`st.knust.edu.gh` today, others later).
 */
export const KNUST_EMAIL_PATTERN = /^[^@\s]+@([a-z0-9-]+\.)*knust\.edu\.gh$/i;

export function validateKnustEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Email address is required.';
  if (!KNUST_EMAIL_PATTERN.test(email)) {
    return 'Use your KNUST email (e.g. you@st.knust.edu.gh).';
  }
  return null;
}

/* ------------------------------ password --------------------------------- */

/** Matches the server's @Size(min) on both registration and password reset. */
export const PASSWORD_MIN_LENGTH = 6;

export function validatePassword(value: string): string | null {
  if (!value) return 'Password is required.';
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return null;
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (!confirm) return 'Please confirm your password.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

/* ------------------------------ bookings --------------------------------- */

/** Booking.purpose is an unsized varchar; keep it inside the column default. */
export const PURPOSE_MAX_LENGTH = 200;

/** Matches Booking.notes @Column(length = 1000). */
export const NOTES_MAX_LENGTH = 1000;

/**
 * Attendance is optional, but a filled-in value has to be a positive number the
 * room can actually seat. The booking form already shows the capacity.
 */
export function validateAttendance(value: string, capacity: number): string | null {
  const text = value.trim();
  if (!text) return null; // optional

  const count = Number(text);
  if (!Number.isInteger(count) || count <= 0) {
    return 'Expected attendance must be a whole number above zero.';
  }
  if (count > capacity) {
    return `This room seats ${capacity}. Reduce the expected attendance or pick a larger room.`;
  }
  return null;
}
