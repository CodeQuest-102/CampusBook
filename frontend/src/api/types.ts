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
  startTime: string; // ISO LocalDateTime (no timezone)
  endTime: string;
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

export interface ReportsResponse {
  overview: {
    totalRooms: number;
    totalBookings: number;
    pendingRequests: number;
  };
  mostBookedRoom: { name: string; count: number };
  peakDay: { name: string; count: number };
  utilizationRate: number;
  bookingsOverTime: { label: string; value: number }[];
}
