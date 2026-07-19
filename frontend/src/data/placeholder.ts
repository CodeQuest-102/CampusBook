/**
 * Local placeholder data. No backend — everything here is static and used to
 * populate the UI so the screens look real. Shapes mirror what a Spring Boot /
 * PostgreSQL backend would eventually return.
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

/* -------------------------------------------------------------------------- */

export const rooms: Room[] = [
  {
    id: 'r1',
    name: 'Lecture Room A101',
    building: 'Engineering Block A',
    floor: '1st Floor',
    capacity: 120,
    facilities: ['Projector', 'A/C', 'Whiteboard'],
    status: 'available',
    description:
      'Spacious lecture room with ergonomic seating, ceiling projector, whiteboard and good ventilation.',
  },
  {
    id: 'r2',
    name: 'Lecture Room B12',
    building: 'Business School',
    floor: '2nd Floor',
    capacity: 80,
    facilities: ['A/C', 'Whiteboard'],
    status: 'available',
    description:
      'Mid-sized teaching room ideal for seminars and guest lectures, air-conditioned with a large whiteboard.',
  },
  {
    id: 'r3',
    name: 'Seminar Hall 1',
    building: 'CCB Auditorium',
    floor: 'Ground Floor',
    capacity: 200,
    facilities: ['Projector', 'A/C', 'Stage', 'Sound System'],
    status: 'in_use',
    description:
      'Large auditorium with raised stage and full sound system, suited to workshops and large gatherings.',
  },
  {
    id: 'r4',
    name: 'Room K3.04',
    building: 'KSB Block',
    floor: '3rd Floor',
    capacity: 60,
    facilities: ['Whiteboard'],
    status: 'maintenance',
    description:
      'Compact tutorial room currently closed for scheduled maintenance and equipment upgrades.',
  },
];

export const myBookings: Booking[] = [
  {
    id: 'b1',
    roomName: 'Lecture Room A101',
    building: 'Engineering Block A',
    date: '16 May 2026',
    startTime: '10:00 AM',
    endTime: '12:00 PM',
    purpose: 'Department Meeting',
    status: 'approved',
  },
  {
    id: 'b2',
    roomName: 'Lecture Room B12',
    building: 'Business School',
    date: '16 May 2026',
    startTime: '2:00 PM',
    endTime: '4:00 PM',
    purpose: 'Guest Lecture',
    status: 'pending',
  },
  {
    id: 'b3',
    roomName: 'Seminar Hall 1',
    building: 'CCB Auditorium',
    date: '20 May 2026',
    startTime: '9:00 AM',
    endTime: '11:00 AM',
    purpose: 'Workshop',
    status: 'rejected',
  },
];

export const pendingRequests: BookingRequest[] = [
  {
    id: 'req1',
    requesterName: 'Muntari Abubakar Sadiq',
    requesterRole: 'Student',
    requesterDept: 'Computer Science',
    avatarColor: '#0340CF',
    roomName: 'Lecture Room A101',
    building: 'Engineering Block A',
    date: '15 May 2026',
    startTime: '10:00 AM',
    endTime: '12:00 PM',
    purpose: 'Department Meeting',
    status: 'pending',
    attendance: 80,
    notes: 'We will need the projector.',
  },
  {
    id: 'req2',
    requesterName: 'Ama Serwaa Oyei',
    requesterRole: 'Staff',
    requesterDept: 'Business School',
    avatarColor: '#1FA85B',
    roomName: 'Lecture Room B12',
    building: 'Business School',
    date: '18 May 2026',
    startTime: '2:00 PM',
    endTime: '4:00 PM',
    purpose: 'Guest Lecture',
    status: 'pending',
    attendance: 55,
    notes: 'Please ensure the A/C is working.',
  },
  {
    id: 'req3',
    requesterName: 'Kofi Mensah',
    requesterRole: 'Student',
    requesterDept: 'CCB Auditorium',
    avatarColor: '#F2792B',
    roomName: 'CCB Auditorium',
    building: 'CCB Auditorium',
    date: '20 May 2026',
    startTime: '9:00 AM',
    endTime: '11:00 AM',
    purpose: 'Workshop',
    status: 'pending',
    attendance: 150,
    notes: 'Sound system required for the session.',
  },
];

export const notifications: AppNotification[] = [
  {
    id: 'n1',
    type: 'approved',
    title: 'Booking Approved',
    body: 'Your booking for Engineering Block A (A101) has been approved.',
    time: 'Today',
    read: false,
  },
  {
    id: 'n2',
    type: 'rejected',
    title: 'Booking Rejected',
    body: 'Your booking for CCB Auditorium has been rejected.',
    time: 'Yesterday',
    read: false,
  },
  {
    id: 'n3',
    type: 'reminder',
    title: 'Booking Reminder',
    body: 'You have a booking tomorrow at 10:00 AM — 12:00 PM.',
    time: 'Yesterday',
    read: true,
  },
  {
    id: 'n4',
    type: 'message',
    title: 'New Message',
    body: 'You have a new message from the Administrator.',
    time: '2 days ago',
    read: true,
  },
  {
    id: 'n5',
    type: 'cancelled',
    title: 'Booking Cancelled',
    body: 'Your booking for Room K3.04 has been cancelled.',
    time: '3 days ago',
    read: true,
  },
];

/** Simple day-schedule entries used by the calendar / day view. */
export interface ScheduleEntry {
  id: string;
  startTime: string;
  endTime: string;
  roomName: string;
  purpose: string;
  status: BookingStatus;
}

export const daySchedule: ScheduleEntry[] = [
  {
    id: 's1',
    startTime: '10:00 AM',
    endTime: '12:00 PM',
    roomName: 'Engineering Block A (A101)',
    purpose: 'Department Meeting',
    status: 'approved',
  },
  {
    id: 's2',
    startTime: '2:00 PM',
    endTime: '4:00 PM',
    roomName: 'Business School (B12)',
    purpose: 'Guest Lecture',
    status: 'pending',
  },
];

export const currentUser: CurrentUser = {
  name: 'Abubakar Sadiq',
  role: 'student',
  roleLabel: 'Computer Science Department · Student',
  department: 'Computer Science',
  email: 'smaliduyakubu@st.knust.edu.gh',
};

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  role: 'Student' | 'Staff' | 'Admin';
  department: string;
  avatarColor: string;
}

export const directoryUsers: DirectoryUser[] = [
  { id: 'u1', name: 'Abubakar Sadiq', email: 'a.sadiq@st.knust.edu.gh', role: 'Student', department: 'Computer Science', avatarColor: '#0340CF' },
  { id: 'u2', name: 'Dr. Kwaku Mensah', email: 'k.mensah@knust.edu.gh', role: 'Staff', department: 'Engineering', avatarColor: '#1FA85B' },
  { id: 'u3', name: 'Ama Serwaa Oyei', email: 'a.oyei@knust.edu.gh', role: 'Staff', department: 'Business School', avatarColor: '#F2792B' },
  { id: 'u4', name: 'Kofi Mensah', email: 'k.mensah2@st.knust.edu.gh', role: 'Student', department: 'Architecture', avatarColor: '#E4483C' },
  { id: 'u5', name: 'System Admin', email: 'admin@knust.edu.gh', role: 'Admin', department: 'ICT Directorate', avatarColor: '#5B6472' },
];

/** Role-specific dashboard stats. */
export const studentStats = { booked: 2, pending: 1, approved: 3 };
export const staffStats = { upcoming: 5, pending: 2, approved: 8 };
export const adminOverview = { totalRooms: 45, totalBookings: 128, pendingRequests: 12 };

/** Reports & analytics placeholder figures. */
export const analytics = {
  mostBookedRoom: { name: 'Engineering Block A (A101)', count: 35 },
  peakDay: { day: 'Wednesday', count: 32 },
  utilizationRate: 72,
  bookingsOverTime: [
    { label: 'Mon', value: 60 },
    { label: 'Tue', value: 45 },
    { label: 'Wed', value: 95 },
    { label: 'Thu', value: 40 },
    { label: 'Fri', value: 75 },
    { label: 'Sat', value: 25 },
  ],
};
