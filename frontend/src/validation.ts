/**
 * Form validation rules shared between screens.
 *
 * Every rule here is also enforced by the API (RegisterRequest, BookingRequest,
 * BookingService) — these exist to catch problems before the request goes out
 * and to keep the inputs themselves constrained. The server stays the gate.
 */

import type { Role } from './data/types';

/** Digits in a valid campus ID, by role. Admins and platform admins are provisioned, not self-registered. */
export const CAMPUS_ID_LENGTH: Record<Role, number> = {
  student: 8,
  staff: 9,
  admin: 0,
  platform_admin: 0,
};

/** Field label for a role's campus ID. Admins carry a staff number. */
export function campusIdLabel(role: Role): string {
  return role === 'student' ? 'Student ID' : 'Staff ID';
}

/** Strips everything that isn't a digit — campus IDs are numeric. */
export function digitsOnly(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

/** Returns an error message for an invalid campus ID, or null when it's fine. */
export function validateCampusId(role: Role, value: string): string | null {
  const expected = CAMPUS_ID_LENGTH[role];
  const id = value.trim();
  const label = campusIdLabel(role);

  // Admin numbers are institution-issued with no published format (the seeded
  // one is "ADMIN001"), so there's nothing to check past "they gave us one".
  if (!expected) return id ? null : `${label} is required.`;

  if (!id) return `${label} is required.`;
  if (!/^\d+$/.test(id)) return `${label} must contain digits only.`;
  if (id.length !== expected) return `${label} must be exactly ${expected} digits.`;
  return null;
}

/* ------------------------------ full name -------------------------------- */

/** Matches the server's @NotBlank on RegisterRequest.fullName. */
export function validateFullName(value: string): string | null {
  if (!value.trim()) return 'Full name is required.';
  return null;
}

/* ------------------------------- email ----------------------------------- */

/**
 * Admin-provisioned accounts (AddUserScreen → POST /api/users) are still
 * restricted to KNUST addresses — see AdminCreateUserRequest, which is
 * unchanged. This is NOT used for self-registration (SignUpScreen); that
 * uses validateEmail below, since self-registration now resolves the
 * institution dynamically from the email domain on the server.
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

/**
 * Self-registration (SignUpScreen) now supports any institution — the
 * legitimate domain list lives server-side (UserService.registerUser,
 * matched against the institutions table) because it can change without a
 * client release. This is just a basic shape check so a typo is caught
 * before the round-trip; the server remains the real gate on which domains
 * actually resolve to an institution.
 */
const EMAIL_SHAPE_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Email address is required.';
  if (!EMAIL_SHAPE_PATTERN.test(email)) {
    return 'Enter a valid email address.';
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
