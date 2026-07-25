/**
 * Domain model types shared across the UI. These shapes mirror what the
 * Spring Boot / PostgreSQL backend returns; the API layer (`src/api`) maps
 * server DTOs onto them via `src/api/adapters.ts`.
 */

export type Role = 'student' | 'staff' | 'admin';

export type RoomStatus = 'available' | 'in_use' | 'maintenance';
export type BookingStatus = 'approved' | 'pending' | 'rejected' | 'cancelled';

export interface Room {
  id: string;
  name: string; // e.g. "Lecture Room A101"
  building: string; // e.g. "Engineering Block A"
  floor: string;
  capacity: number;
  facilities: string[];
  status: RoomStatus;
  description: string;
}

export interface Booking {
  id: string;
  roomName: string;
  building: string;
  date: string; // display string, e.g. "15 May 2026"
  startTime: string;
  endTime: string;
  purpose: string;
  status: BookingStatus;
  attendance?: number;
  notes?: string;
}

export interface BookingRequest extends Booking {
  requesterName: string;
  requesterRole: 'Student' | 'Staff';
  requesterDept: string;
  avatarColor: string;
}

export type NotificationType =
  | 'approved'
  | 'rejected'
  | 'reminder'
  | 'message'
  | 'cancelled';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

export interface CurrentUser {
  name: string;
  role: Role;
  roleLabel: string;
  department: string;
  email: string;
}

export interface ScheduleEntry {
  id: string;
  startTime: string;
  endTime: string;
  roomName: string;
  purpose: string;
  status: BookingStatus;
}

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  role: 'Student' | 'Staff' | 'Admin';
  department: string;
  avatarColor: string;
}
