/**
 * TypeScript mirrors of the backend DTOs. Field names match the JSON the Spring
 * Boot API returns; adapters in `adapters.ts` translate these into the UI shapes
 * declared in `src/data/placeholder.ts`.
 */

/** Backend role enum. */
export type BackendRole = 'ADMIN' | 'LECTURER' | 'STUDENT_LEADER';

/** Backend booking status enum. */
export type BackendBookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface AuthResponse {
  token: string;
  fullName: string;
  email: string;
  role: BackendRole;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  staffOrStudentId: string;
  password: string;
  role: BackendRole;
  department?: string;
}

/**
 * Same fields as {@link RegisterPayload}, different gate: this one goes to the
 * admin-only `POST /api/users`, so `role` may be `ADMIN` — public sign-up
 * refuses that.
 */
export type AdminCreateUserPayload = RegisterPayload;

export interface LoginPayload {
  emailOrId: string;
  password: string;
}

export interface HallResponse {
  id: number;
  block: string;
  roomCode: string;
  capacity: number;
  hasProjector: boolean;
  hasAC: boolean;
  hasMicrophone: boolean;
  active: boolean;
}

export interface HallPayload {
  block: string;
  roomCode: string;
  capacity: number;
  hasProjector: boolean;
  hasAC: boolean;
  hasMicrophone: boolean;
  active: boolean;
}

export interface BookingResponse {
  id: number;
  hallId: number;
  roomCode: string;
  block: string;
  userId: number;
  userFullName: string;
  userRole: BackendRole | null;
  userDepartment: string | null;
  purpose: string;
  notes: string | null;
  attendance: number | null;
  startTime: string; // ISO LocalDateTime, e.g. "2026-05-16T10:00:00"
  endTime: string;
  status: BackendBookingStatus;
  approvedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface BookingPayload {
  hallId: number;
  purpose: string;
  notes?: string;
  attendance?: number;
  startTime: string; // ISO LocalDateTime (no timezone)
  endTime: string;
}

export interface ReschedulePayload {
  startTime: string;
  endTime: string;
}

export interface RecurringBookingPayload {
  hallId: number;
  purpose: string;
  notes?: string;
  attendance?: number;
  startTime: string; // first occurrence, ISO LocalDateTime
  endTime: string;
  until: string; // ISO date (YYYY-MM-DD), inclusive
}

export interface RecurringBookingResponse {
  requested: number;
  created: BookingResponse[];
  skipped: { date: string; reason: string }[];
}

export interface UpdateProfilePayload {
  fullName?: string;
  department?: string;
}

export type BookingAuditAction =
  | 'CREATED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'RESCHEDULED';

/** One entry in a booking's audit trail. */
export interface BookingAuditResponse {
  id: number;
  action: BookingAuditAction;
  actorName: string | null;
  details: string | null;
  createdAt: string;
}

/**
 * Per-id outcome of a bulk approve/reject. Some ids can fail (e.g. the slot was
 * taken) while others succeed, so the caller must inspect `failed`.
 */
export interface BulkActionResponse {
  requested: number;
  succeeded: number[];
  failed: { id: number; reason: string }[];
}

/** Pagination envelope returned by list endpoints (mirrors backend PagedResponse). */
export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ForgotPasswordPayload {
  emailOrId: string;
}

export interface ResetPasswordPayload {
  emailOrId: string;
  otp: string;
  newPassword: string;
}

export type BackendNotificationType =
  | 'NEW_BOOKING_REQUEST'
  | 'BOOKING_APPROVED'
  | 'BOOKING_REJECTED'
  | 'BOOKING_CANCELLED';

export interface NotificationResponse {
  id: number;
  type: BackendNotificationType;
  title: string;
  message: string;
  relatedBookingId: number | null;
  // Jackson may serialize the boolean field either way depending on config.
  read?: boolean;
  isRead?: boolean;
  createdAt: string;
}

export interface UserResponse {
  id: number;
  fullName: string;
  email: string;
  staffOrStudentId: string;
  role: BackendRole;
  department: string | null;
}

export interface HallAvailabilityResponse {
  hallId: number;
  date: string;
  occupiedSlots: {
    startTime: string;
    endTime: string;
    bookedBy: string;
  }[];
}

export type SubscriptionTier = 'FREE' | 'CAMPUS_PRO' | 'ENTERPRISE';

export interface SubscriptionResponse {
  tier: SubscriptionTier;
  planName: string;
  priceLabel: string;
  analytics: boolean;
  prioritySupport: boolean;
  customNotifications: boolean;
  apiIntegrations: boolean;
  activeHallLimit: number | null; // null = unlimited
  monthlyBookingLimit: number | null;
  activeHallsUsed: number;
  monthlyBookingsUsed: number;
  features: string[];
}

export interface PlanResponse {
  tier: SubscriptionTier;
  name: string;
  priceLabel: string;
  activeHallLimit: number | null;
  monthlyBookingLimit: number | null;
  selfServe: boolean;
  features: string[];
}

export interface ReportsOverview {
  totalRooms: number;
  totalBookings: number;
  pendingRequests: number;
}

export interface ReportsResponse {
  mostBookedRoom: { name: string; count: number };
  peakDay: { name: string; count: number };
  utilizationRate: number;
  bookingsOverTime: { label: string; value: number }[];
}
