/**
 * Translation layer between backend DTOs (`types.ts`) and the UI shapes the
 * screens already use (`src/data/types.ts`). Keeping the mapping here means
 * the components don't change shape when data goes live.
 */
import type {
  Room,
  Booking,
  BookingRequest,
  AppNotification,
  NotificationType,
  Role,
  ScheduleEntry,
  DirectoryUser,
  BookingStatus,
} from '../data/types';
import type {
  HallResponse,
  BookingResponse,
  NotificationResponse,
  UserResponse,
  BackendRole,
  BackendNotificationType,
  HallAvailabilityResponse,
} from './types';

/* ----------------------------- roles ------------------------------------- */

export function roleToBackend(role: Role): BackendRole {
  switch (role) {
    case 'admin':
      return 'ADMIN';
    case 'staff':
      return 'LECTURER';
    default:
      return 'STUDENT_LEADER';
  }
}

export function roleFromBackend(role: BackendRole | string | null): Role {
  switch (role) {
    case 'PLATFORM_ADMIN':
      return 'platform_admin';
    case 'ADMIN':
      return 'admin';
    case 'LECTURER':
      return 'staff';
    default:
      return 'student';
  }
}

/** UI label for the request-card requester role. */
function requesterRoleLabel(role: BackendRole | string | null): 'Student' | 'Staff' {
  return role === 'LECTURER' || role === 'ADMIN' ? 'Staff' : 'Student';
}

/** Directory role label used by the admin Users screen tabs. */
function directoryRoleLabel(role: BackendRole | string): DirectoryUser['role'] {
  switch (role) {
    case 'ADMIN':
      return 'Admin';
    case 'LECTURER':
      return 'Staff';
    default:
      return 'Student';
  }
}

/* --------------------------- date / time --------------------------------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** ISO LocalDateTime ("2026-05-16T10:00:00") → Date in local time. */
function parseLocalDateTime(iso: string): Date {
  // Strip any trailing zone info; treat as local wall-clock time.
  const [datePart, timePartRaw = '00:00:00'] = iso.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePartRaw.split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
}

export function formatDisplayDate(iso: string): string {
  const dt = parseLocalDateTime(iso);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

export function formatDisplayTime(iso: string): string {
  return formatTimeFromDate(parseLocalDateTime(iso));
}

function formatTimeFromDate(dt: Date): string {
  let h = dt.getHours();
  const m = dt.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** "10:00 AM" → { hours, minutes } in 24h. */
function parseTimeLabel(label: string): { hours: number; minutes: number } {
  const match = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hours: 0, minutes: 0 };
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hours += 12;
  return { hours, minutes: Number(match[2]) };
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Combine a picked Date + a "10:00 AM"-style label into an ISO LocalDateTime
 * string (no timezone), which is what the backend's LocalDateTime expects.
 */
export function toLocalDateTimeIso(date: Date, timeLabel: string): string {
  const { hours, minutes } = parseTimeLabel(timeLabel);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(hours)}:${pad(minutes)}:00`
  );
}

/** A Date -> "YYYY-MM-DD" (for availability queries). */
export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/* ------------------------------ halls ------------------------------------ */

export function hallFacilities(hall: HallResponse): string[] {
  const f: string[] = [];
  if (hall.hasProjector) f.push('Projector');
  if (hall.hasAC) f.push('A/C');
  if (hall.hasMicrophone) f.push('Microphone');
  return f;
}

export function hallToRoom(hall: HallResponse): Room {
  return {
    id: String(hall.id),
    name: `Room ${hall.roomCode}`,
    building: hall.block,
    floor: `Capacity ${hall.capacity}`,
    capacity: hall.capacity,
    facilities: hallFacilities(hall),
    status: hall.active ? 'available' : 'maintenance',
    description: `${hall.block} — Room ${hall.roomCode}. Seats up to ${hall.capacity}.`,
  };
}

/* ----------------------------- bookings ---------------------------------- */

function bookingStatusFromBackend(status: string): BookingStatus {
  return status.toLowerCase() as BookingStatus;
}

export function bookingToUi(b: BookingResponse): Booking {
  return {
    id: String(b.id),
    roomName: `Room ${b.roomCode}`,
    building: b.block,
    date: formatDisplayDate(b.startTime),
    startTime: formatDisplayTime(b.startTime),
    endTime: formatDisplayTime(b.endTime),
    purpose: b.purpose,
    status: bookingStatusFromBackend(b.status),
    attendance: b.attendance ?? undefined,
    // Prefer the requester's own notes; fall back to a rejection reason.
    notes: b.notes ?? b.rejectionReason ?? undefined,
  };
}

const AVATAR_COLORS = ['#0340CF', '#1FA85B', '#F2792B', '#E4483C', '#5B6472', '#7A3FF2'];

/** Deterministic avatar color from a name so cards look consistent. */
export function avatarColor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function bookingToRequest(b: BookingResponse): BookingRequest {
  return {
    ...bookingToUi(b),
    requesterName: b.userFullName,
    requesterRole: requesterRoleLabel(b.userRole),
    requesterDept: b.userDepartment ?? '—',
    avatarColor: avatarColor(b.userFullName),
  };
}

export function bookingToSchedule(b: BookingResponse): ScheduleEntry {
  return {
    id: String(b.id),
    startTime: formatDisplayTime(b.startTime),
    endTime: formatDisplayTime(b.endTime),
    roomName: `${b.block} (${b.roomCode})`,
    purpose: b.purpose,
    status: bookingStatusFromBackend(b.status),
  };
}

/* --------------------------- notifications ------------------------------- */

function notificationTypeFromBackend(type: BackendNotificationType): NotificationType {
  switch (type) {
    case 'BOOKING_APPROVED':
      return 'approved';
    case 'BOOKING_REJECTED':
      return 'rejected';
    case 'BOOKING_CANCELLED':
      return 'cancelled';
    case 'NEW_BOOKING_REQUEST':
    default:
      return 'message';
  }
}

/** Rough relative-time label from an ISO timestamp. */
function relativeTime(iso: string): string {
  const then = parseLocalDateTime(iso).getTime();
  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export function notificationToUi(n: NotificationResponse): AppNotification {
  const read = n.read ?? n.isRead ?? false;
  return {
    id: String(n.id),
    type: notificationTypeFromBackend(n.type),
    title: n.title,
    body: n.message,
    time: relativeTime(n.createdAt),
    read,
  };
}

/* ------------------------------ users ------------------------------------ */

export function userToDirectory(u: UserResponse): DirectoryUser {
  return {
    id: String(u.id),
    name: u.fullName,
    email: u.email,
    role: directoryRoleLabel(u.role),
    department: u.department ?? '—',
    avatarColor: avatarColor(u.fullName),
  };
}

/* --------------------------- availability -------------------------------- */

/**
 * Occupied slots for a room on a day, for anyone browsing it.
 *
 * The response carries `bookedBy`, but this deliberately drops it: a student
 * picking a room needs to know *that* a slot is taken, not who took it. Naming
 * the holder would turn every room page into a roster of who is meeting when.
 * Admins see names on the request screen, where they have a reason to.
 */
export function availabilityToSchedule(a: HallAvailabilityResponse): ScheduleEntry[] {
  return a.occupiedSlots.map((slot, i) => ({
    id: `occ-${i}`,
    startTime: formatDisplayTime(slot.startTime),
    endTime: formatDisplayTime(slot.endTime),
    roomName: 'Booked',
    purpose: 'Not available',
    status: 'approved' as BookingStatus,
  }));
}
