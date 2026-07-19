import {
  roleToBackend,
  roleFromBackend,
  hallToRoom,
  hallFacilities,
  bookingToUi,
  bookingToRequest,
  notificationToUi,
  toLocalDateTimeIso,
  toLocalDateString,
  formatDisplayDate,
  formatDisplayTime,
} from '../adapters';
import type { HallResponse, BookingResponse, NotificationResponse } from '../types';

const hall: HallResponse = {
  id: 2,
  block: 'Science Complex Block',
  roomCode: 'GF1',
  capacity: 120,
  hasProjector: true,
  hasAC: false,
  hasMicrophone: true,
  active: true,
};

const booking: BookingResponse = {
  id: 33,
  hallId: 2,
  roomCode: 'GF1',
  block: 'Science Complex Block',
  userId: 5,
  userFullName: 'Abubakar Sadiq',
  userRole: 'STUDENT_LEADER',
  userDepartment: 'Computer Science',
  purpose: 'Robotics Meeting',
  notes: 'Need projector',
  attendance: 45,
  startTime: '2026-07-20T10:00:00',
  endTime: '2026-07-20T12:00:00',
  status: 'PENDING',
  approvedBy: null,
  rejectionReason: null,
  createdAt: '2026-07-19T09:00:00',
};

describe('role mapping', () => {
  it('maps frontend roles to backend enums', () => {
    expect(roleToBackend('admin')).toBe('ADMIN');
    expect(roleToBackend('staff')).toBe('LECTURER');
    expect(roleToBackend('student')).toBe('STUDENT_LEADER');
  });

  it('maps backend enums back to frontend roles', () => {
    expect(roleFromBackend('ADMIN')).toBe('admin');
    expect(roleFromBackend('LECTURER')).toBe('staff');
    expect(roleFromBackend('STUDENT_LEADER')).toBe('student');
    expect(roleFromBackend(null)).toBe('student');
  });
});

describe('hallToRoom', () => {
  it('builds facilities from the boolean flags', () => {
    expect(hallFacilities(hall)).toEqual(['Projector', 'Microphone']);
  });

  it('maps a hall into the UI Room shape', () => {
    const room = hallToRoom(hall);
    expect(room.id).toBe('2');
    expect(room.building).toBe('Science Complex Block');
    expect(room.name).toBe('Room GF1');
    expect(room.capacity).toBe(120);
    expect(room.status).toBe('available');
  });

  it('marks inactive halls as maintenance', () => {
    expect(hallToRoom({ ...hall, active: false }).status).toBe('maintenance');
  });
});

describe('bookingToUi', () => {
  it('formats date/time and lowercases status', () => {
    const ui = bookingToUi(booking);
    expect(ui.status).toBe('pending');
    expect(ui.date).toBe('20 Jul 2026');
    expect(ui.startTime).toBe('10:00 AM');
    expect(ui.endTime).toBe('12:00 PM');
    expect(ui.notes).toBe('Need projector');
    expect(ui.attendance).toBe(45);
  });

  it('falls back to rejectionReason when there are no notes', () => {
    const ui = bookingToUi({ ...booking, notes: null, rejectionReason: 'Room unavailable' });
    expect(ui.notes).toBe('Room unavailable');
  });

  it('exposes requester details for admin request cards', () => {
    const req = bookingToRequest(booking);
    expect(req.requesterName).toBe('Abubakar Sadiq');
    expect(req.requesterRole).toBe('Student');
    expect(req.requesterDept).toBe('Computer Science');
    expect(req.avatarColor).toMatch(/^#/);
  });
});

describe('notificationToUi', () => {
  it('maps type + read flag (read key)', () => {
    const n: NotificationResponse = {
      id: 1,
      type: 'BOOKING_APPROVED',
      title: 'Approved',
      message: 'Your booking was approved',
      relatedBookingId: 33,
      read: true,
      createdAt: '2026-07-19T09:00:00',
    };
    const ui = notificationToUi(n);
    expect(ui.type).toBe('approved');
    expect(ui.read).toBe(true);
  });

  it('falls back to isRead when read is absent', () => {
    const n: NotificationResponse = {
      id: 2,
      type: 'NEW_BOOKING_REQUEST',
      title: 'New request',
      message: 'A new booking request',
      relatedBookingId: null,
      isRead: false,
      createdAt: '2026-07-19T09:00:00',
    };
    const ui = notificationToUi(n);
    expect(ui.type).toBe('message');
    expect(ui.read).toBe(false);
  });
});

describe('date/time helpers', () => {
  it('combines a date + time label into an ISO LocalDateTime', () => {
    const d = new Date(2026, 6, 20); // 20 Jul 2026, local
    expect(toLocalDateTimeIso(d, '10:00 AM')).toBe('2026-07-20T10:00:00');
    expect(toLocalDateTimeIso(d, '2:30 PM')).toBe('2026-07-20T14:30:00');
    expect(toLocalDateTimeIso(d, '12:00 AM')).toBe('2026-07-20T00:00:00');
    expect(toLocalDateTimeIso(d, '12:00 PM')).toBe('2026-07-20T12:00:00');
  });

  it('formats a local date string for availability queries', () => {
    expect(toLocalDateString(new Date(2026, 6, 5))).toBe('2026-07-05');
  });

  it('round-trips display formatting', () => {
    expect(formatDisplayDate('2026-07-20T10:00:00')).toBe('20 Jul 2026');
    expect(formatDisplayTime('2026-07-20T14:05:00')).toBe('2:05 PM');
  });
});
